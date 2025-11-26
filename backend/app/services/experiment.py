from datetime import datetime
from sqlalchemy.orm import Session
from app.models.experiment import Experiment
from app.schemas.experiment import ExperimentCreate, ExperimentUpdate


def create_experiment(db: Session, experiment: ExperimentCreate):
    now = datetime.now()
    db_experiment = Experiment(
        name=experiment.name,
        description=experiment.description,
        config=experiment.config,
        created_at=now,
        updated_at=now
    )
    db.add(db_experiment)
    db.commit()
    db.refresh(db_experiment)
    return db_experiment


def get_experiment(db: Session, experiment_id: int):
    return db.query(Experiment).filter(Experiment.id == experiment_id).first()


def get_experiments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Experiment).offset(skip).limit(limit).all()


def update_experiment(db: Session, experiment_id: int, experiment: ExperimentUpdate):
    db_experiment = get_experiment(db, experiment_id)
    if not db_experiment:
        return None
    
    update_data = experiment.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_experiment, field, value)
    
    db.commit()
    db.refresh(db_experiment)
    return db_experiment


def delete_experiment(db: Session, experiment_id: int):
    db_experiment = get_experiment(db, experiment_id)
    if not db_experiment:
        return False
    
    db.delete(db_experiment)
    db.commit()
    return True
