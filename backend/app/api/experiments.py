from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.experiment import Experiment
from app.models.user import User
from app.schemas.experiment import ExperimentCreate, ExperimentResponse, ExperimentUpdate
from app.services.experiment import create_experiment, get_experiment, get_experiments, update_experiment, delete_experiment
from app.tasks.train import train_model_task
from app.api.deps import get_current_active_user, get_current_developer_user

router = APIRouter()

@router.post("/", response_model=ExperimentResponse)
def create_new_experiment(experiment: ExperimentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_developer_user)):
    return create_experiment(db=db, experiment=experiment)

@router.get("/", response_model=list[ExperimentResponse])
def read_experiments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return get_experiments(db=db, skip=skip, limit=limit)



@router.get("/{experiment_id}", response_model=ExperimentResponse)
def read_experiment(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return get_experiment(db=db, experiment_id=experiment_id)

@router.put("/{experiment_id}", response_model=ExperimentResponse)
def update_existing_experiment(experiment_id: int, experiment: ExperimentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_developer_user)):
    return update_experiment(db=db, experiment_id=experiment_id, experiment=experiment)

@router.delete("/{experiment_id}")
def delete_existing_experiment(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_developer_user)):
    return delete_experiment(db=db, experiment_id=experiment_id)

@router.post("/{experiment_id}/run")
def run_experiment(experiment_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_developer_user)):
    experiment = get_experiment(db=db, experiment_id=experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    # Add training task to background
    background_tasks.add_task(train_model_task, experiment_id, experiment.config, db)
    
    return {"message": "Experiment started successfully"}
