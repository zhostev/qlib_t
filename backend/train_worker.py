#!/usr/bin/env python3
"""
训练节点应用，用于执行模型训练任务
从数据库中获取待执行的任务，并调用现有的训练函数来执行任务
"""

import asyncio
import logging
import os
from sqlalchemy.orm import Session
from app.db.database import engine, SessionLocal, Base
from app.services.task import TaskService
from app.tasks.train import train_model_task

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TrainWorker:
    def __init__(self, worker_id: str, max_workers: int = 2):
        self.worker_id = worker_id
        self.max_workers = max_workers
        self.running = False
    
    def get_db(self):
        """获取数据库会话"""
        return SessionLocal()
    
    async def run(self):
        """启动任务执行器"""
        self.running = True
        logger.info(f"Train worker {self.worker_id} started")
        
        while self.running:
            try:
                db = self.get_db()
                # 获取待处理任务
                tasks = TaskService.get_pending_tasks(db, limit=self.max_workers)
                
                if not tasks:
                    # 没有待处理任务，等待一段时间
                    logger.info(f"No pending tasks, waiting for 5 seconds...")
                    await asyncio.sleep(5)
                    continue
                
                # 并行执行任务
                await asyncio.gather(*[self.process_task(task) for task in tasks])
            except Exception as e:
                logger.error(f"Error in train worker: {e}")
                await asyncio.sleep(5)
    
    async def process_task(self, task):
        """处理单个任务"""
        logger.info(f"Processing task {task.id} for experiment {task.experiment_id}")
        
        db = self.get_db()
        try:
            # 更新任务状态为运行中
            TaskService.update_task_status(db, task.id, "running", progress=0)
            
            # 执行任务
            if task.task_type == "train":
                # 调用训练函数
                await train_model_task(task.experiment_id, {}, db)
                
                # 更新任务状态为完成
                TaskService.update_task_status(db, task.id, "completed", progress=100)
                logger.info(f"Task {task.id} completed successfully")
            else:
                # 其他任务类型
                logger.warning(f"Unknown task type: {task.task_type}")
                TaskService.update_task_status(db, task.id, "failed", error=f"Unknown task type: {task.task_type}")
        except Exception as e:
            # 更新任务状态为失败
            logger.error(f"Task {task.id} failed: {e}")
            TaskService.update_task_status(db, task.id, "failed", error=str(e))
        finally:
            db.close()
    
    def stop(self):
        """停止任务执行器"""
        self.running = False
        logger.info(f"Train worker {self.worker_id} stopped")

async def main():
    """主函数"""
    # 创建训练节点实例
    worker = TrainWorker("local_train_worker", max_workers=2)
    
    try:
        # 启动训练节点
        await worker.run()
    except KeyboardInterrupt:
        # 处理键盘中断
        worker.stop()
        logger.info("Train worker stopped by user")

if __name__ == "__main__":
    # 运行主函数
    asyncio.run(main())
