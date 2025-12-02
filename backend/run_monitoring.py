#!/usr/bin/env python3
"""
Run monitoring checks periodically
"""

import time
import logging
from app.services.monitoring import MonitoringService
from app.db.database import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_monitoring():
    """Run monitoring checks"""
    db = SessionLocal()
    try:
        monitoring_service = MonitoringService(db)
        result = monitoring_service.run_monitoring()
        return result
    finally:
        db.close()

if __name__ == "__main__":
    # Run monitoring every 5 minutes
    while True:
        run_monitoring()
        logger.info("Monitoring check completed, sleeping for 300 seconds...")
        time.sleep(300)
