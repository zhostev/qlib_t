import psutil
import time
from datetime import datetime
from typing import Dict, Any, List
import threading
import logging

logger = logging.getLogger(__name__)

class SystemMonitor:
    """系统监控服务，用于收集系统资源占用情况"""
    
    def __init__(self, interval: int = 60):
        """初始化系统监控服务"""
        self.interval = interval  # 监控间隔（秒）
        self.running = False
        self.metrics = []
        self.lock = threading.Lock()
    
    def start(self):
        """启动监控服务"""
        if self.running:
            logger.warning("System monitor is already running")
            return
        
        self.running = True
        logger.info(f"Starting system monitor with interval {self.interval} seconds")
        
        # 启动监控线程
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
    
    def stop(self):
        """停止监控服务"""
        self.running = False
        if hasattr(self, 'thread'):
            self.thread.join(timeout=5)
        logger.info("System monitor stopped")
    
    def _monitor_loop(self):
        """监控循环"""
        while self.running:
            try:
                metrics = self.collect_metrics()
                with self.lock:
                    self.metrics.append(metrics)
                    # 只保留最近1000条记录
                    if len(self.metrics) > 1000:
                        self.metrics = self.metrics[-1000:]
                
                time.sleep(self.interval)
            except Exception as e:
                logger.error(f"Error in system monitor: {e}")
                time.sleep(self.interval)
    
    def collect_metrics(self) -> Dict[str, Any]:
        """收集系统指标"""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "usage_percent": psutil.cpu_percent(interval=0.1),
                "count": psutil.cpu_count(),
                "freq": psutil.cpu_freq().current if psutil.cpu_freq() else 0
            },
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "used": psutil.virtual_memory().used,
                "usage_percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "used": psutil.disk_usage('/').used,
                "free": psutil.disk_usage('/').free,
                "usage_percent": psutil.disk_usage('/').percent
            },
            "network": {
                "bytes_sent": psutil.net_io_counters().bytes_sent,
                "bytes_recv": psutil.net_io_counters().bytes_recv,
                "packets_sent": psutil.net_io_counters().packets_sent,
                "packets_recv": psutil.net_io_counters().packets_recv
            },
            "process": {
                "count": len(psutil.pids()),
                "cpu_usage": psutil.Process().cpu_percent(interval=0.1),
                "memory_usage": psutil.Process().memory_percent()
            }
        }
        return metrics
    
    def get_metrics(self, limit: int = 100) -> List[Dict[str, Any]]:
        """获取最近的监控指标"""
        with self.lock:
            return self.metrics[-limit:]
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """获取当前的监控指标"""
        return self.collect_metrics()

# 创建全局监控实例
monitor = SystemMonitor(interval=60)
