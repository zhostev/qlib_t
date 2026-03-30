#!/usr/bin/env python3
"""
Training worker that executes model training tasks.
Polls the database for pending tasks and runs qlib training locally.
"""

import asyncio
import logging
import os
import sys
import json
from datetime import datetime

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, Base, engine
from app.services.task import TaskService
from app.models.experiment import Experiment
from app.services.local_trainer import LocalTrainer

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
try:
    os.makedirs(log_dir, exist_ok=True)
except OSError as e:
    log_dir = "/tmp"
    print(f"Warning: Could not create log directory, using /tmp: {e}", file=sys.stderr)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(log_dir, "train_worker.log"), mode="a"),
    ],
)
logger = logging.getLogger(__name__)

logger.info(f"Starting train_worker.py with Python {sys.version}")
logger.info(f"Current working directory: {os.getcwd()}")


class TrainWorker:
    def __init__(self, worker_id: str, max_workers: int = 2, poll_interval: int = 5):
        self.worker_id = worker_id
        self.max_workers = max_workers
        self.poll_interval = poll_interval
        self.running = False
        self._active_tasks: set = set()

    def _get_db(self) -> Session:
        return SessionLocal()

    async def run(self):
        """Main loop: poll for pending tasks and execute them."""
        self.running = True
        logger.info(f"Train worker '{self.worker_id}' started (max_workers={self.max_workers})")

        while self.running:
            try:
                available_slots = self.max_workers - len(self._active_tasks)
                if available_slots <= 0:
                    await asyncio.sleep(self.poll_interval)
                    continue

                db = self._get_db()
                try:
                    tasks = TaskService.get_pending_tasks(db, limit=available_slots)
                finally:
                    db.close()

                if not tasks:
                    await asyncio.sleep(self.poll_interval)
                    continue

                for task in tasks:
                    if task.id not in self._active_tasks:
                        self._active_tasks.add(task.id)
                        asyncio.create_task(self._process_task_wrapper(task.id, task.experiment_id))

            except Exception as e:
                logger.error(f"Error in worker main loop: {e}", exc_info=True)
                await asyncio.sleep(self.poll_interval)

    async def _process_task_wrapper(self, task_id: int, experiment_id: int):
        """Wrapper to ensure task is removed from active set when done."""
        try:
            await self._process_task(task_id, experiment_id)
        finally:
            self._active_tasks.discard(task_id)

    async def _process_task(self, task_id: int, experiment_id: int):
        """Process a single training task."""
        logger.info(f"Processing task {task_id} for experiment {experiment_id}")

        db = self._get_db()
        try:
            experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if not experiment:
                logger.error(f"Experiment {experiment_id} not found for task {task_id}")
                TaskService.update_task_status(db, task_id, "failed", error="Experiment not found")
                return

            # Mark task as running
            TaskService.update_task_status(db, task_id, "running", progress=0)

            experiment_config = experiment.config or {}

            # Create progress callback
            def progress_callback(progress: int, message: str):
                try:
                    inner_db = self._get_db()
                    try:
                        TaskService.update_task_status(inner_db, task_id, "running", progress=progress)
                        # Also add log entry
                        self._add_log(inner_db, experiment_id, message)
                    finally:
                        inner_db.close()
                except Exception as e:
                    logger.warning(f"Failed to update progress for task {task_id}: {e}")

            # Run training in a thread to avoid blocking the event loop
            trainer = LocalTrainer(progress_callback=progress_callback)

            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, trainer.run_training, experiment_config
            )

            # Update task with results
            db_fresh = self._get_db()
            try:
                if results.get("status") == "completed":
                    performance = results.get("performance", {})
                    TaskService.update_task_status(
                        db_fresh, task_id, "completed",
                        progress=100,
                        result={"performance": performance, "model_class": results.get("model_class", "unknown")},
                    )
                    self._add_log(db_fresh, experiment_id, "Training completed successfully")
                    logger.info(f"Task {task_id} completed successfully")
                else:
                    error_msg = results.get("error", "Unknown error")
                    task = TaskService.get_task(db_fresh, task_id)
                    if task and task.retries < task.max_retries:
                        logger.info(f"Task {task_id} failed, scheduling retry ({task.retries + 1}/{task.max_retries})")
                        TaskService.retry_task(db_fresh, task_id)
                        self._add_log(db_fresh, experiment_id, f"Training failed, retrying: {error_msg}")
                    else:
                        TaskService.update_task_status(db_fresh, task_id, "failed", error=error_msg)
                        self._add_log(db_fresh, experiment_id, f"Training failed: {error_msg}")
                        logger.error(f"Task {task_id} failed: {error_msg}")
            finally:
                db_fresh.close()

        except Exception as e:
            logger.error(f"Task {task_id} processing error: {e}", exc_info=True)
            try:
                TaskService.update_task_status(db, task_id, "failed", error=str(e))
                self._add_log(db, experiment_id, f"Task processing error: {e}")
            except Exception:
                pass
        finally:
            db.close()

    def _add_log(self, db: Session, experiment_id: int, message: str):
        """Add a log entry for the experiment."""
        try:
            from app.models.log import ExperimentLog
            log_entry = ExperimentLog(experiment_id=experiment_id, message=message)
            db.add(log_entry)
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to add log entry: {e}")

    def stop(self):
        self.running = False
        logger.info(f"Train worker '{self.worker_id}' stopping...")


async def main():
    """Entry point for the training worker."""
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)

    worker = TrainWorker(
        worker_id="local_worker",
        max_workers=int(os.getenv("MAX_TRAINING_WORKERS", "2")),
        poll_interval=int(os.getenv("WORKER_POLL_INTERVAL", "5")),
    )

    try:
        await worker.run()
    except KeyboardInterrupt:
        worker.stop()
        logger.info("Train worker stopped by user")


if __name__ == "__main__":
    asyncio.run(main())
