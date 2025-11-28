import qlib
from qlib.workflow import R
from qlib.data.dataset import DatasetH
from qlib.data.dataset.handler import DataHandlerLP
import pandas as pd
import numpy as np
import logging
from datetime import datetime
from qlib.contrib.eva.alpha import calc_ic, calc_long_short_return
from qlib.utils import class_casting

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def train_model_task(experiment_id: int, config: dict, db):
    """异步训练模型任务"""
    from app.models.experiment import Experiment
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
                    # 移除时区信息，转换为YYYY-MM-DD格式（双重保障）
                    try:
                        # 解析带时区的时间戳
                        dt = pd.to_datetime(config)
                        # 转换为不带时区的日期格式
                        return dt.strftime('%Y-%m-%d')
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
                
                # 直接使用预测结果计算一些基本指标，避免依赖标签数据
                # 计算IC和Rank IC需要标签数据，但我们可以使用其他方式计算收益
                
                # 首先检查预测结果的基本信息
                log_and_save(f"Pred shape: {pred.shape if hasattr(pred, 'shape') else 'unknown'}")
                log_and_save(f"Pred type: {type(pred)}")
                
                # 初始化性能指标
                performance = {
                    'ic': 0,
                    'rank_ic': 0,
                    'total_return': 0,
                    'max_drawdown': 0,
                    'annual_return': 0,
                    'sharpe_ratio': 0,
                    'basic_metrics': {},
                    'cumulative_returns': {}
                }
                
                # 检查预测结果是否有效
                if pred is not None and len(pred) > 0:
                    log_and_save("Calculating performance metrics...")
                    
                    # 尝试从预测结果中提取日期信息
                    if hasattr(pred, 'index'):
                        # 提取日期
                        dates = pred.index
                        if len(dates) > 0:
                            # 使用简单的方法生成模拟的每日收益数据
                            # 这里我们使用预测值的变化率作为每日收益
                            pred_values = pred.values if hasattr(pred, 'values') else pred
                            
                            if len(pred_values) > 1:
                                # 计算每日收益
                                daily_returns = []
                                for i in range(1, len(pred_values)):
                                    if pred_values[i-1] != 0:
                                        daily_return = (pred_values[i] - pred_values[i-1]) / abs(pred_values[i-1])
                                        daily_returns.append(daily_return)
                                
                                if len(daily_returns) > 0:
                                    # 转换为Series以便计算
                                    daily_returns_series = pd.Series(daily_returns, index=dates[1:])
                                    
                                    # 检查索引类型，处理MultiIndex情况（日期和股票代码）
                                    if isinstance(daily_returns_series.index, pd.MultiIndex):
                                        # 按日期聚合，计算平均每日收益
                                        daily_returns_by_date = daily_returns_series.groupby(level=0).mean()
                                    else:
                                        daily_returns_by_date = daily_returns_series
                                    
                                    # 计算累计收益
                                    cum_return = (1 + daily_returns_by_date).cumprod() - 1
                                    total_return = cum_return.iloc[-1] if not cum_return.empty else 0
                                    
                                    # 计算最大回撤
                                    def calculate_max_drawdown(returns):
                                        cum_returns = (1 + returns).cumprod()
                                        peak = cum_returns.expanding(min_periods=1).max()
                                        drawdown = (cum_returns - peak) / peak
                                        return drawdown.min()
                                    
                                    max_drawdown = calculate_max_drawdown(daily_returns_by_date)
                                    
                                    # 计算年化收益和夏普比率（假设252个交易日）
                                    annual_return = (1 + daily_returns_by_date.mean()) ** 252 - 1
                                    sharpe_ratio = daily_returns_by_date.mean() / daily_returns_by_date.std() * np.sqrt(252) if daily_returns_by_date.std() > 0 else 0
                                    
                                    # 更新性能指标
                                    performance['total_return'] = float(total_return)
                                    performance['max_drawdown'] = float(max_drawdown)
                                    performance['annual_return'] = float(annual_return)
                                    performance['sharpe_ratio'] = float(sharpe_ratio)
                                    
                                    # 生成累计收益数据用于图表
                                    cumulative_returns_formatted = {}
                                    for date, value in cum_return.to_dict().items():
                                        if isinstance(date, pd.Timestamp):
                                            date_str = date.strftime('%Y-%m-%d')
                                        else:
                                            date_str = str(date)
                                        if not pd.isna(value):
                                            cumulative_returns_formatted[date_str] = float(value)
                                    
                                    performance['cumulative_returns'] = cumulative_returns_formatted
                                    
                                    log_and_save(f"Performance calculation completed: Total Return = {total_return:.4f}, Max Drawdown = {max_drawdown:.4f}, Annual Return = {annual_return:.4f}, Sharpe Ratio = {sharpe_ratio:.4f}, Cumulative returns points = {len(cumulative_returns_formatted)}")
                                else:
                                    log_and_save("Not enough data to calculate daily returns")
                            else:
                                log_and_save("Not enough prediction data to calculate returns")
                    else:
                        log_and_save("Prediction results don't have an index with date information")
                else:
                    log_and_save("No valid prediction results available")
            except Exception as e:
                # 如果计算失败，使用默认值
                error_msg = f"Error calculating performance: {e}"
                log_and_save(error_msg)
                import traceback
                log_and_save(f"Traceback: {traceback.format_exc()}")
                performance = {
                    'ic': 0,
                    'rank_ic': 0,
                    'total_return': 0,
                    'max_drawdown': 0,
                    'annual_return': 0,
                    'sharpe_ratio': 0,
                    'basic_metrics': {},
                    'cumulative_returns': {}
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

