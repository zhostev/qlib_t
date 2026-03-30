from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime
import asyncio
import logging

from app.db.database import get_db
from app.api.deps import get_current_active_user, get_current_developer_user
from app.models.user import User
from app.models.experiment import Experiment
from app.services.task import TaskService
from app.services.local_trainer import LocalTrainer

logger = logging.getLogger(__name__)

router = APIRouter()


async def _run_inline_training(task_id: int, experiment_id: int, config: Dict[str, Any]):
    """
    Run training inline (used when train_worker is not running).
    This executes the training directly in the FastAPI process.
    """
    from app.db.database import SessionLocal

    def progress_callback(progress: int, message: str):
        try:
            db = SessionLocal()
            try:
                TaskService.update_task_status(db, task_id, "running", progress=progress)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Progress callback failed: {e}")

    trainer = LocalTrainer(progress_callback=progress_callback)

    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, trainer.run_training, config)

    db = SessionLocal()
    try:
        if results.get("status") == "completed":
            performance = results.get("performance", {})
            TaskService.update_task_status(
                db, task_id, "completed",
                progress=100,
                result={"performance": performance, "model_class": results.get("model_class", "unknown")},
            )
        else:
            error_msg = results.get("error", "Unknown error")
            TaskService.update_task_status(db, task_id, "failed", error=error_msg)
    finally:
        db.close()


@router.post("/train")
def train_endpoint(
    config: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user),
):
    """
    Create a training task from a configuration.
    If an experiment name is provided, creates an experiment first.
    The task is picked up by the train_worker for execution.
    """
    # Create or find experiment
    experiment_name = config.get("name", config.get("experiment_name", f"train_{datetime.now().strftime('%Y%m%d_%H%M%S')}"))

    experiment = Experiment(
        name=experiment_name,
        description=config.get("description", "Created via training API"),
        config=config,
        status="pending",
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    # Create a task for the train_worker to pick up
    task = TaskService.create_task(db=db, experiment_id=experiment.id, task_type="train")

    return {
        "task_id": task.id,
        "experiment_id": experiment.id,
        "status": "pending",
        "message": "Training task created. It will be executed by the training worker.",
    }


@router.get("/tasks")
def get_tasks(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all training tasks with pagination."""
    from app.models.task import Task

    tasks = (
        db.query(Task)
        .order_by(Task.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "experiment_id": t.experiment_id,
            "status": t.status,
            "task_type": t.task_type,
            "progress": t.progress,
            "error": t.error,
            "result": t.result,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "started_at": t.started_at.isoformat() if t.started_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        }
        for t in tasks
    ]


@router.get("/tasks/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific training task."""
    task = TaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": task.id,
        "experiment_id": task.experiment_id,
        "status": task.status,
        "task_type": task.task_type,
        "progress": task.progress,
        "error": task.error,
        "result": task.result,
        "retries": task.retries,
        "max_retries": task.max_retries,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user),
):
    """Delete a training task (only if not running)."""
    from app.models.task import Task

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == "running":
        raise HTTPException(status_code=400, detail="Cannot delete a running task")
    db.delete(task)
    db.commit()
    return {"status": "success", "message": f"Task {task_id} deleted"}
