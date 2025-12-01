import logging
from datetime import datetime
import asyncio
from typing import Dict, Any
from app.services.training_client import training_client

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def train_model_task(experiment_id: int, config: dict, db):
    """异步训练模型任务 - 使用远程训练服务器"""
    from app.models.experiment import Experiment
    
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
        
        # 使用实验配置，如果没有传入配置
        if not config:
            config = experiment.config
            log_and_save("Using experiment's own configuration")
        
        # 更新进度
        experiment.progress = 10.0
        experiment.logs = ''.join(log_entries)
        db.commit()
        log_and_save("Progress updated to 10%")
        
        # 发送训练请求到本地服务器
        log_and_save("Sending training request to local server...")
        log_and_save(f"Training server URL: {training_client.base_url}")
        
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
                    import pandas as pd
                    dt = pd.to_datetime(config)
                    # 转换为不带时区的日期格式
                    return dt.strftime('%Y-%m-%d')
                except:
                    # 如果解析失败，返回原始字符串
                    return config
            else:
                return config
        
        # 转换配置中的时间戳
        processed_config = convert_timestamps(config)
        
        # 发送训练请求
        training_response = await training_client.start_training(experiment_id, processed_config)
        task_id = training_response.get("task_id")
        log_and_save(f"Training started on local server with task ID: {task_id}")
        
        # 更新进度
        experiment.progress = 20.0
        experiment.logs = ''.join(log_entries)
        db.commit()
        log_and_save("Progress updated to 20%")
        
        # 等待训练完成
        log_and_save("Waiting for training to complete...")
        
        while True:
            try:
                # 获取训练状态
                status_response = await training_client.get_training_status(task_id)
                status = status_response.get("status")
                progress = status_response.get("progress", 0)
                logs = status_response.get("logs", [])
                
                # 更新实验日志
                for log_entry in logs:
                    log_and_save(f"[Remote] {log_entry}")
                
                # 更新实验进度
                experiment.progress = min(90.0, 20.0 + (progress * 0.7))  # 20% base + 70% of remote progress
                experiment.logs = ''.join(log_entries)
                db.commit()
                
                if status == "completed":
                    log_and_save("Training completed successfully on local server")
                    break
                elif status == "failed":
                    error = status_response.get("error", "Unknown error")
                    log_and_save(f"Training failed on local server: {error}")
                    experiment.status = "failed"
                    experiment.error = error
                    experiment.end_time = datetime.now()
                    experiment.logs = ''.join(log_entries)
                    db.commit()
                    return
                
                # 等待一段时间后再次检查
                await asyncio.sleep(10)
            except Exception as e:
                log_and_save(f"Error checking training status: {e}")
                # 继续尝试，不要立即失败
                await asyncio.sleep(30)
        
        # 获取训练结果
        log_and_save("Getting training results from local server...")
        results = await training_client.get_training_results(task_id)
        log_and_save(f"Training results received: {results}")
        
        # 更新进度
        experiment.progress = 90.0
        experiment.logs = ''.join(log_entries)
        db.commit()
        log_and_save("Progress updated to 90%")
        
        # 处理性能指标
        try:
            performance = results.get("performance", {})
            log_and_save(f"Performance metrics from local server: {performance}")
            
            # 更新实验性能指标
            experiment.performance = performance
            log_and_save("Experiment performance updated")
            
        except Exception as e:
            log_and_save(f"Error processing performance metrics: {e}")
            experiment.error = str(e)
        
        # 更新实验状态为完成
        experiment.progress = 100.0
        experiment.status = "completed"
        experiment.end_time = datetime.now()
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

