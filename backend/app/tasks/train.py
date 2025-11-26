import qlib
from qlib.workflow import R
from qlib.data.dataset import DatasetH
import pandas as pd
import numpy as np
import os
from datetime import datetime

async def train_model_task(experiment_id: int, config: dict, db):
    """异步训练模型任务"""
    from app.models.experiment import Experiment
    from app.models.model_version import ModelVersion
    from app.services.model_version import create_model_version
    
    # 获取实验对象
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        return
    
    try:
        # 更新实验状态为运行中
        experiment.status = "running"
        db.commit()
        
        # 初始化qlib
        qlib.init()
        
        # 开始实验
        with R.start(experiment_name=f'exp_{experiment_id}'):
            # 解析配置
            model_config = config['task']['model']
            dataset_config = config['task']['dataset']
            
            # 动态加载数据集
            dataset_class = getattr(
                __import__(dataset_config['module_path'], fromlist=[dataset_config['class']]),
                dataset_config['class']
            )
            dataset = dataset_class(**dataset_config.get('kwargs', {}))
            
            # 动态加载模型
            model_class = getattr(
                __import__(model_config['module_path'], fromlist=[model_config['class']]),
                model_config['class']
            )
            model = model_class(**model_config.get('kwargs', {}))
            
            # 训练模型
            model.fit(dataset)
            
            # 生成预测
            pred = model.predict(dataset)
            
            # 获取标签数据
            df_test = dataset.prepare("test", col_set=["label"], data_key="label")
            label = df_test["label"]
            
            # 计算收益
            performance = calculate_performance(pred, label)
            
            # 保存模型和结果
            R.save_objects(trained_model=model, prediction=pred, performance=performance)
            
            # 获取当前记录器
            recorder = R.get_recorder()
            
            # 创建模型版本
            model_path = f"experiments/exp_{experiment_id}/run_{recorder.id}/"
            model_version = create_model_version(
                db=db,
                model={
                    "experiment_id": experiment_id,
                    "version": 1,  # 这里可以根据实际情况生成版本号
                    "name": f"{model_config['class']}_v1",
                    "metrics": {},  # 这里可以添加模型指标
                    "path": model_path,
                    "performance": performance
                }
            )
            
            # 更新实验结果
            experiment.status = "completed"
            experiment.performance = performance
            db.commit()
            
    except Exception as e:
        # 更新实验状态为失败
        experiment.status = "failed"
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
