from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
from datetime import datetime
from app.api import api_router
from app.db.database import engine, Base

# Create all database tables
Base.metadata.create_all(bind=engine)

# Configure logging with detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.StreamHandler(),
        # logging.FileHandler('app.log', mode='a')  # Uncomment for file logging
    ]
)
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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://116.62.59.244", "http://qlib.hoo.ink"],  # Allow frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom validation exception handler"""
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "message": "Invalid input data"
        }
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Custom SQLAlchemy exception handler"""
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Database error",
            "message": "An error occurred while accessing the database"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Custom general exception handler"""
    logger.error(f"General error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    """Middleware to log all incoming requests"""
    import time
    
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(f"Request: {request.method} {request.url} from {client_ip}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(f"Response: {request.method} {request.url} - Status: {response.status_code} - Time: {process_time:.4f}s")
    
    return response

# Add performance monitoring middleware
@app.middleware("http")
async def monitor_performance(request, call_next):
    """Middleware to monitor request performance"""
    import time
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Add X-Process-Time header to response
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    
    # Log slow requests
    if process_time > 1.0:  # Log requests taking more than 1 second
        client_ip = request.client.host if request.client else "unknown"
        logger.warning(f"Slow Request: {request.method} {request.url} from {client_ip} - Time: {process_time:.4f}s")
    
    return response

# Include API router
app.include_router(api_router, prefix="/api")

# Add custom exception handlers
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom validation exception handler"""
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "message": "Invalid input data"
        }
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Custom SQLAlchemy exception handler"""
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Database error",
            "message": "An error occurred while accessing the database"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Custom general exception handler"""
    logger.error(f"General error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )

# Root endpoint
@app.get("/")
def root():
    return {"message": "Welcome to QLib AI API"}

# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "QLib AI API",
        "version": "1.0.0"
    }

# System status endpoint
@app.get("/status")
def system_status():
    """System status endpoint with detailed information"""
    import psutil
    import os
    
    # Get system information
    memory = psutil.virtual_memory()
    cpu_percent = psutil.cpu_percent(interval=1)
    disk = psutil.disk_usage('/')
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "QLib AI API",
        "version": "1.0.0",
        "system": {
            "cpu_percent": cpu_percent,
            "memory_used": memory.used / (1024 ** 3),
            "memory_total": memory.total / (1024 ** 3),
            "memory_percent": memory.percent,
            "disk_used": disk.used / (1024 ** 3),
            "disk_total": disk.total / (1024 ** 3),
            "disk_percent": disk.percent,
            "process_id": os.getpid(),
            "python_version": os.environ.get("PYTHON_VERSION", "unknown")
        },
        "api_docs": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_json": "/openapi.json"
        }
    }
