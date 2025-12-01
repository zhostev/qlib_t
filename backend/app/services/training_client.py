import httpx
from app.config import settings
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class TrainingClient:
    """API client for communicating with the local training server"""
    
    def __init__(self):
        self.base_url = settings.TRAINING_SERVER_URL
        self.timeout = settings.TRAINING_SERVER_TIMEOUT
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={"Content-Type": "application/json"}
        )
    
    async def start_training(self, experiment_id: int, config: Dict[str, Any]) -> Dict[str, Any]:
        """Start a training task on the local server"""
        try:
            response = await self.client.post(
                "/api/train",
                json={
                    "experiment_id": experiment_id,
                    "config": config
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"HTTP error when starting training: {e}")
            raise
        except Exception as e:
            logger.error(f"Error when starting training: {e}")
            raise
    
    async def get_training_status(self, task_id: str) -> Dict[str, Any]:
        """Get the status of a training task"""
        try:
            response = await self.client.get(f"/api/train/{task_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"HTTP error when getting training status: {e}")
            raise
        except Exception as e:
            logger.error(f"Error when getting training status: {e}")
            raise
    
    async def get_training_results(self, task_id: str) -> Dict[str, Any]:
        """Get the results of a completed training task"""
        try:
            response = await self.client.get(f"/api/train/{task_id}/results")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"HTTP error when getting training results: {e}")
            raise
        except Exception as e:
            logger.error(f"Error when getting training results: {e}")
            raise
    
    async def stop_training(self, task_id: str) -> Dict[str, Any]:
        """Stop a running training task"""
        try:
            response = await self.client.post(f"/api/train/{task_id}/stop")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"HTTP error when stopping training: {e}")
            raise
        except Exception as e:
            logger.error(f"Error when stopping training: {e}")
            raise
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Create a singleton instance
training_client = TrainingClient()
