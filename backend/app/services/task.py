from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.task import Task
from app.models.experiment import Experiment
from app.services.analysis import AnalysisService
from sqlalchemy.sql import func

class TaskService:
    @staticmethod
    def create_task(db: Session, experiment_id: int, task_type: str = "train", priority: int = 0) -> Task:
        """创建新任务"""
        # 更新实验状态为pending
        experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if experiment:
            experiment.status = "pending"
            db.commit()
        
        # 创建任务
        task = Task(
            experiment_id=experiment_id,
            task_type=task_type,
            priority=priority
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def get_task(db: Session, task_id: int) -> Task or None:
        """获取特定任务"""
        return db.query(Task).filter(Task.id == task_id).first()
    
    @staticmethod
    def get_pending_tasks(db: Session, limit: int = 10) -> list[Task]:
        """获取待处理任务"""
        return db.query(Task).filter(Task.status == "pending").order_by(Task.priority.desc(), Task.created_at).limit(limit).all()
    
    @staticmethod
    def update_task_status(db: Session, task_id: int, status: str, result: dict = None, error: str = None, progress: int = None) -> Task or None:
        """更新任务状态"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None
        
        task.status = status
        
        # 更新时间
        if status == "running" and not task.started_at:
            task.started_at = func.now()
        elif status in ["completed", "failed"] and not task.completed_at:
            task.completed_at = func.now()
        
        # 更新结果和错误
        if result is not None:
            task.result = result
        if error is not None:
            task.error = error
        if progress is not None:
            task.progress = progress
        
        # 更新实验状态
        experiment = db.query(Experiment).filter(Experiment.id == task.experiment_id).first()
        if experiment:
            experiment.status = status
            if progress is not None:
                experiment.progress = progress
            if error is not None:
                experiment.error = error
            if result is not None:
                experiment.performance = result.get("performance")
                
                # Generate analysis data when experiment completes successfully
                if status == "completed":
                    # In a real implementation, we would generate actual analysis data here
                    # For now, we'll just set a flag or placeholder
                    # experiment.analysis = AnalysisService.get_full_analysis(experiment)
                    pass
        
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def get_tasks_by_experiment(db: Session, experiment_id: int) -> list[Task]:
        """获取特定实验的所有任务"""
        return db.query(Task).filter(Task.experiment_id == experiment_id).order_by(Task.created_at.desc()).all()
