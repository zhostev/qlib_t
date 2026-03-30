from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.task import Task
from app.models.user import User
from app.services.task import TaskService
from app.api.deps import get_current_active_user, get_current_developer_user

router = APIRouter()

@router.get("/", response_model=list)
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """获取任务列表"""
    tasks = db.query(Task).order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    return tasks

@router.get("/{task_id}", response_model=dict)
def read_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """获取单个任务详情"""
    task = TaskService.get_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/{task_id}/cancel")
def cancel_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_developer_user)):
    """取消任务"""
    task = TaskService.get_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel task with status '{task.status}'")

    TaskService.update_task_status(db, task_id, "cancelled")
    return {"message": f"Task {task_id} cancelled successfully"}

@router.post("/{task_id}/retry")
def retry_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_developer_user)):
    """重试任务"""
    task = TaskService.retry_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or max retries reached")
    return {"message": f"Task {task_id} retried successfully", "task_id": task.id}

@router.get("/experiment/{experiment_id}", response_model=list)
def read_tasks_by_experiment(experiment_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """获取特定实验的所有任务"""
    return TaskService.get_tasks_by_experiment(db=db, experiment_id=experiment_id)
