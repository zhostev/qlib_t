from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.api import api_router
from app.db.database import engine, Base

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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://116.62.59.244"],  # Allow frontend origins
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
