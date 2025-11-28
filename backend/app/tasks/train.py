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
        # 初始化日志
        log_entries = []
        def log_and_save(message):
            """记录日志并保存到实验日志中"""
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] {message}\n"
            log_entries.append(log_entry)
            logger.info(message)
            
            # 更新实验日志
            experiment.logs = ''.join(log_entries)
            db.commit()
        
        log_and_save(f"Starting experiment {experiment_id}: {experiment.name}")
        
        # 更新实验状态为运行中
        experiment.status = "running"
        experiment.start_time = datetime.now()
        experiment.progress = 0.0
        experiment.logs = ''.join(log_entries)
        db.commit()
        log_and_save(f"Experiment {experiment_id} status updated to 'running'")
        
        # 初始化qlib
        log_and_save("Initializing QLib...")
        from qlib.config import REG_CN
        qlib.init(provider_uri="/home/idea/.qlib/qlib_data/cn_data", region=REG_CN)
        log_and_save("QLib initialized successfully")
        
        # 更新进度
        experiment.progress = 10.0
        experiment.logs = ''.join(log_entries)
        db.commit()
        log_and_save("Progress updated to 10%")
        
        # 开始实验
        with R.start(experiment_name=f'exp_{experiment_id}'):
            log_and_save(f"Experiment run started with name: exp_{experiment_id}")
            
            # 使用实验配置，如果没有传入配置
            if not config:
                config = experiment.config
                log_and_save("Using experiment's own configuration")
            
            # 解析配置
            log_and_save("Parsing experiment configuration...")
            
            # 转换配置中的时间戳，移除时区信息
            def convert_timestamps(config):
                """递归转换配置中的时间戳，移除时区信息"""
                if isinstance(config, dict):
                    return {k: convert_timestamps(v) for k, v in config.items()}
                elif isinstance(config, list):
                    return [convert_timestamps(item) for item in config]
                elif isinstance(config, str) and 'T' in config and ('Z' in config or '+' in config or '-' in config):
                    # 移除时区信息，转换为YYYY-MM-DD HH:MM:SS格式
                    try:
                        # 解析带时区的时间戳
                        dt = pd.to_datetime(config)
                        # 转换为不带时区的时间戳
                        return dt.strftime('%Y-%m-%d %H:%M:%S')
                    except:
                        # 如果解析失败，返回原始字符串
                        return config
                else:
                    return config
            
            # 转换配置中的时间戳
            config = convert_timestamps(config)
            
            model_config = config['task']['model']
            dataset_config = config['task']['dataset']
            log_and_save(f"Model config: {model_config['class']} from {model_config['module_path']}")
            log_and_save(f"Dataset config: {dataset_config['class']} from {dataset_config['module_path']}")
            
            # 更新进度
            experiment.progress = 20.0
            experiment.logs = ''.join(log_entries)
            db.commit()
            log_and_save("Progress updated to 20%")
            
            # 动态加载数据集
            log_and_save(f"Loading dataset {dataset_config['class']}...")
            dataset_class = getattr(
                __import__(dataset_config['module_path'], fromlist=[dataset_config['class']]),
                dataset_config['class']
            )
            dataset = dataset_class(**dataset_config.get('kwargs', {}))
            log_and_save(f"Dataset {dataset_config['class']} loaded successfully")
            
            # 更新进度
            experiment.progress = 30.0
            experiment.logs = ''.join(log_entries)
            db.commit()
            log_and_save("Progress updated to 30%")
            
            # 动态加载模型
            log_and_save(f"Loading model {model_config['class']}...")
            model_class = getattr(
                __import__(model_config['module_path'], fromlist=[model_config['class']]),
                model_config['class']
            )
            model = model_class(**model_config.get('kwargs', {}))
            log_and_save(f"Model {model_config['class']} loaded successfully")
            
            # 更新进度
            experiment.progress = 40.0
            experiment.logs = ''.join(log_entries)
            db.commit()
            log_and_save("Progress updated to 40%")
            
            # 训练模型
            log_and_save("Starting model training...")
            model.fit(dataset)
            log_and_save("Model training completed")
            
            # 更新进度
            experiment.progress = 70.0
            experiment.logs = ''.join(log_entries)
            db.commit()
            log_and_save("Progress updated to 70%")
            
            # 生成预测
            log_and_save("Generating predictions...")
            pred = model.predict(dataset)
            log_and_save(f"Predictions generated with shape: {pred.shape if hasattr(pred, 'shape') else 'unknown'}")
            
            # 更新进度
            experiment.progress = 80.0
            experiment.logs = ''.join(log_entries)
            db.commit()
            log_and_save("Progress updated to 80%")
            
            # 尝试获取标签数据并计算性能指标
            try:
                # 获取标签数据
                log_and_save("Getting label data for performance calculation...")
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
                log_and_save("Calculating performance metrics...")
                performance = calculate_performance(pred, label)
                log_and_save(f"Performance calculation completed: Total Return = {performance['total_return']:.4f}")
            except Exception as e:
                # 如果获取标签数据或计算性能指标失败，使用空的性能数据
                error_msg = f"Error calculating performance: {e}"
                log_and_save(error_msg)
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
            log_and_save("Saving model and results...")
            R.save_objects(trained_model=model, prediction=pred, performance=performance)
            log_and_save("Model and results saved successfully")
            
            # 获取当前记录器
            recorder = R.get_recorder()
            log_and_save(f"Experiment run completed with recorder ID: {recorder.id}")
            
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
                log_and_save(f"Model version created successfully: {model_version.id}")
            except Exception as e:
                # 如果创建模型版本失败，记录错误信息，但不影响实验结果
                error_msg = f"Error creating model version: {e}"
                log_and_save(error_msg)
            
            # 更新实验结果
            experiment.status = "completed"
            experiment.end_time = datetime.now()
            experiment.progress = 100.0
            experiment.performance = performance
            experiment.logs = ''.join(log_entries)
            db.commit()
            log_and_save(f"Experiment {experiment_id} completed successfully")
            
    except Exception as e:
        # 更新实验状态为失败
        error_msg = f"Experiment failed: {str(e)}"
        log_entries.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {error_msg}\n")
        experiment.status = "failed"
        experiment.end_time = datetime.now()
        experiment.progress = 0.0
        experiment.error = str(e)
        experiment.logs = ''.join(log_entries)
        db.commit()
        logger.error(error_msg)


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
