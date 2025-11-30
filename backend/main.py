from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging
from app.api import api_router
from app.db.database import engine, Base
from app.tasks.task_worker import TaskWorker

# Create all database tables
Base.metadata.create_all(bind=engine)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="QLib AI API",
    description="API for managing QLib experiments and models",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Allow frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")

# Root endpoint
@app.get("/")
def root():
    return {"message": "Welcome to QLib AI API"}

# Task worker instance
worker = None

@app.on_event("startup")
async def startup_event():
    """Startup event handler to start the task worker"""
    global worker
    logger.info("Starting task worker...")
    worker = TaskWorker("main_worker", max_workers=2)
    # Start the task worker in the background
    asyncio.create_task(worker.run())
    logger.info("Task worker started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler to stop the task worker"""
    global worker
    if worker:
        logger.info("Stopping task worker...")
        worker.stop()
        logger.info("Task worker stopped successfully")
