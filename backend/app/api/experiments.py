from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.experiment import Experiment
from app.models.user import User
from app.schemas.experiment import ExperimentCreate, ExperimentResponse, ExperimentUpdate
from app.services.experiment import create_experiment, get_experiment, get_experiments, update_experiment, delete_experiment
from app.tasks.train import train_model_task
from app.api.deps import get_current_active_user

router = APIRouter()

@router.post("/", response_model=ExperimentResponse)
def create_new_experiment(experiment: ExperimentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return create_experiment(db=db, experiment=experiment)

@router.get("/", response_model=list[ExperimentResponse])
def read_experiments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return get_experiments(db=db, skip=skip, limit=limit)

@router.get("/{experiment_id}", response_model=ExperimentResponse)
def read_experiment(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return get_experiment(db=db, experiment_id=experiment_id)

@router.put("/{experiment_id}", response_model=ExperimentResponse)
def update_existing_experiment(experiment_id: int, experiment: ExperimentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return update_experiment(db=db, experiment_id=experiment_id, experiment=experiment)

@router.delete("/{experiment_id}")
def delete_existing_experiment(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return delete_experiment(db=db, experiment_id=experiment_id)

@router.post("/{experiment_id}/run")
def run_experiment(experiment_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    experiment = get_experiment(db=db, experiment_id=experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    # Add training task to background
    background_tasks.add_task(train_model_task, experiment_id, experiment.config, db)
    
    return {"message": "Experiment started successfully"}

@router.get("/profit-loss")
def get_profit_loss(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # 获取所有实验的收益数据
    experiments = get_experiments(db=db)
    profit_loss_data = []
    
    for exp in experiments:
        if exp.performance:
            # 假设performance字段包含收益数据，格式为[{"date": "2023-01-01", "profit": 1000, "loss": 200, "total": 800}]
            for i, data in enumerate(exp.performance):
                profit_loss_data.append({
                    "id": i + 1,
                    "model_id": exp.id,
                    "model_name": exp.name,
                    "date": data.get("date", ""),
                    "profit": data.get("profit", 0),
                    "loss": data.get("loss", 0),
                    "total": data.get("total", 0)
                })
    
    return profit_loss_data
