import qlib
from qlib.workflow import R
from qlib.data.dataset import DatasetH
import pandas as pd
import numpy as np
import os
import logging
from datetime import datetime
from sqlalchemy.sql import func

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def train_model_task(experiment_id: int, config: dict, db):
    """异步训练模型任务"""
    from app.models.experiment import Experiment
    from app.models.model_version import ModelVersion
    from app.services.model_version import create_model_version
    
    # 获取实验对象
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        logger.error(f"Experiment with id {experiment_id} not found")
        return
    
    try:
        logger.info(f"Starting experiment {experiment_id}: {experiment.name}")
        
        # 更新实验状态为运行中
        experiment.status = "running"
        experiment.start_time = func.now()
        experiment.progress = 0.0
        db.commit()
        logger.info(f"Experiment {experiment_id} status updated to 'running'")
        
        # 初始化qlib
        logger.info("Initializing QLib...")
        qlib.init()
        logger.info("QLib initialized successfully")
        
        # 更新进度
        experiment.progress = 10.0
        db.commit()
        
        # 开始实验
        with R.start(experiment_name=f'exp_{experiment_id}'):
            logger.info(f"Experiment run started with name: exp_{experiment_id}")
            
            # 解析配置
            logger.info("Parsing experiment configuration...")
            model_config = config['task']['model']
            dataset_config = config['task']['dataset']
            logger.info(f"Model config: {model_config['class']} from {model_config['module_path']}")
            logger.info(f"Dataset config: {dataset_config['class']} from {dataset_config['module_path']}")
            
            # 更新进度
            experiment.progress = 20.0
            db.commit()
            
            # 动态加载数据集
            logger.info(f"Loading dataset {dataset_config['class']}...")
            dataset_class = getattr(
                __import__(dataset_config['module_path'], fromlist=[dataset_config['class']]),
                dataset_config['class']
            )
            dataset = dataset_class(**dataset_config.get('kwargs', {}))
            logger.info(f"Dataset {dataset_config['class']} loaded successfully")
            
            # 更新进度
            experiment.progress = 30.0
            db.commit()
            
            # 动态加载模型
            logger.info(f"Loading model {model_config['class']}...")
            model_class = getattr(
                __import__(model_config['module_path'], fromlist=[model_config['class']]),
                model_config['class']
            )
            model = model_class(**model_config.get('kwargs', {}))
            logger.info(f"Model {model_config['class']} loaded successfully")
            
            # 更新进度
            experiment.progress = 40.0
            db.commit()
            
            # 训练模型
            logger.info("Starting model training...")
            model.fit(dataset)
            logger.info("Model training completed")
            
            # 更新进度
            experiment.progress = 70.0
            db.commit()
            
            # 生成预测
            logger.info("Generating predictions...")
            pred = model.predict(dataset)
            logger.info(f"Predictions generated with shape: {pred.shape if hasattr(pred, 'shape') else 'unknown'}")
            
            # 更新进度
            experiment.progress = 80.0
            db.commit()
            
            # 尝试获取标签数据并计算性能指标
            try:
                # 获取标签数据
                df_test = dataset.prepare("test", col_set=["label"], data_key="label")
                
                # 灵活处理不同的数据结构
                if isinstance(df_test, pd.DataFrame):
                    # 尝试多种可能的标签列名
                    label_cols = ["label", "LABEL", "target", "TARGET"]
                    label = None
                    for col in label_cols:
                        if col in df_test.columns:
                            label = df_test[col]
                            break
                    
                    # 如果没有找到标签列，使用默认的索引对齐方式
                    if label is None:
                        # 假设pred和df_test有相同的索引，直接使用df_test的第一列作为标签
                        label = df_test.iloc[:, 0] if not df_test.empty else pd.Series()
                else:
                    # 如果df_test不是DataFrame，直接使用它
                    label = df_test
                
                # 计算收益
                performance = calculate_performance(pred, label)
            except Exception as e:
                # 如果获取标签数据或计算性能指标失败，使用空的性能数据
                print(f"Error calculating performance: {e}")
                performance = {
                    'daily_returns': {},
                    'cumulative_returns': {},
                    'risk_metrics': {},
                    'total_return': 0,
                    'max_drawdown': 0,
                    'annual_return': 0,
                    'sharpe_ratio': 0
                }
            
            # 保存模型和结果
            R.save_objects(trained_model=model, prediction=pred, performance=performance)
            
            # 获取当前记录器
            recorder = R.get_recorder()
            
            # 创建模型版本
            try:
                from app.schemas.model_version import ModelVersionCreate
                model_path = f"experiments/exp_{experiment_id}/run_{recorder.id}/"
                
                # 创建ModelVersionCreate对象
                model_version_create = ModelVersionCreate(
                    experiment_id=experiment_id,
                    version=1,  # 这里可以根据实际情况生成版本号
                    name=f"{model_config['class']}_v1",
                    metrics={},  # 这里可以添加模型指标
                    path=model_path,
                    performance=performance
                )
                
                # 创建模型版本
                model_version = create_model_version(
                    db=db,
                    model=model_version_create
                )
                print(f"Model version created successfully: {model_version.id}")
            except Exception as e:
                # 如果创建模型版本失败，打印错误信息，但不影响实验结果
                print(f"Error creating model version: {e}")
            
            # 更新实验结果
            experiment.status = "completed"
            experiment.end_time = func.now()
            experiment.progress = 100.0
            experiment.performance = performance
            db.commit()
            
    except Exception as e:
        # 更新实验状态为失败
        experiment.status = "failed"
        experiment.end_time = func.now()
        experiment.progress = 0.0
        experiment.error = str(e)
        db.commit()


def calculate_performance(pred_df, label_df):
    """计算模型性能指标"""
    # 确保索引一致
    pred_df = pred_df.reindex(label_df.index)
    
    # 计算收益率
    return_df = pred_df * label_df
    
    # 计算累计收益
    cum_return = (1 + return_df).cumprod() - 1
    
    # 计算最大回撤
    def calculate_max_drawdown(returns):
        cum_returns = (1 + returns).cumprod()
        peak = cum_returns.expanding(min_periods=1).max()
        drawdown = (cum_returns - peak) / peak
        return drawdown.min()
    
    max_drawdown = calculate_max_drawdown(return_df)
    
    # 计算年化收益率
    annual_return = (1 + return_df.mean()) ** 252 - 1
    
    # 计算夏普比率
    sharpe_ratio = return_df.mean() / return_df.std() * np.sqrt(252)
    
    return {
        'daily_returns': return_df.to_dict(),
        'cumulative_returns': cum_return.to_dict(),
        'risk_metrics': {},
        'total_return': cum_return.iloc[-1] if not cum_return.empty else 0,
        'max_drawdown': float(max_drawdown),
        'annual_return': float(annual_return),
        'sharpe_ratio': float(sharpe_ratio)
    }
