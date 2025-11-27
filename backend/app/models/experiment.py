from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float
from sqlalchemy.sql import func
from app.db.database import Base

class Experiment(Base):
    __tablename__ = "experiments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    description = Column(Text, nullable=True)
    config = Column(JSON, nullable=False)  # YAML配置的JSON表示
    status = Column(String(20), default="created", nullable=False)  # created, running, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    start_time = Column(DateTime(timezone=True), nullable=True)  # 开始时间
    end_time = Column(DateTime(timezone=True), nullable=True)  # 结束时间
    progress = Column(Float, default=0.0)  # 进度百分比 (0-100)
    logs = Column(Text, nullable=True)  # 实验日志
    performance = Column(JSON, nullable=True)  # 收益数据
    error = Column(Text, nullable=True)  # 错误信息
