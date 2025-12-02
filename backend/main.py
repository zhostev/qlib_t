from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
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

# WebSocket manager for real-time log streaming
class ConnectionManager:
    def __init__(self):
        # key: task_id, value: list of WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
    
    async def send_update(self, message: dict, task_id: str):
        if task_id in self.active_connections:
            for connection in self.active_connections[task_id]:
                await connection.send_json(message)
    
    async def send_log(self, log: str, task_id: str):
        if task_id in self.active_connections:
            for connection in self.active_connections[task_id]:
                await connection.send_text(log)

# Create connection manager instance
manager = ConnectionManager()

# Configure logging with detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('uvicorn.log', mode='a')  # Enable file logging with relative path
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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://116.62.59.244", "http://qlib.hoo.ink", "http://ddns.hoo.ink:8000"],  # Allow frontend origins and DDNS server
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

# WebSocket endpoint for real-time training updates
@app.websocket("/ws/train/{task_id}")
async def websocket_train(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time training updates"""
    await manager.connect(websocket, task_id)
    try:
        # Keep connection alive
        while True:
            # Wait for any message from client (we don't need it, but it keeps the connection alive)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
    except Exception as e:
        logger.error(f"WebSocket error for task {task_id}: {e}")
        manager.disconnect(websocket, task_id)

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

# Export WebSocket manager for use in other modules
global_websocket_manager = manager
