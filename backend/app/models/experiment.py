from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
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
    performance = Column(JSON, nullable=True)  # 收益数据
    error = Column(Text, nullable=True)  # 错误信息
