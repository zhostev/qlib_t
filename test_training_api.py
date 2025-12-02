#!/usr/bin/env python3
"""
Test script for TrainingClient API calls to ddns.hoo.ink server
"""

import asyncio
import sys
import os

# Add the project root and backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app.services.training_client import training_client

async def test_training_api():
    """Test training API endpoints"""
    print(f"Testing training API at: {training_client.base_url}")
    
    try:
        # Test 1: Health check
        print("\n1. Testing health check...")
        response = await training_client.client.get("/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        # Test 2: Try to start a training task (simulated)
        print("\n2. Testing training start...")
        try:
            train_response = await training_client.start_training(
                experiment_id=1,
                config={"model": "test_model", "params": {"learning_rate": 0.001}}
            )
            print(f"   Status: Success")
            print(f"   Response: {train_response}")
        except Exception as e:
            print(f"   Expected error (training may not be configured): {e}")
        
        return True
    except Exception as e:
        print(f"\nAPI test failed: {e}")
        return False
    finally:
        await training_client.close()

if __name__ == "__main__":
    asyncio.run(test_training_api())
