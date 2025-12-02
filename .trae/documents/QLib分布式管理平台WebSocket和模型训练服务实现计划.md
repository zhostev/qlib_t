## 1. 远程服务器代码结构分析

首先需要了解远程服务器上的代码结构，以便制定合适的实现方案。计划使用SSH连接到服务器，查看代码目录结构：

```bash
ssh idea@ddns.hoo.ink -o StrictHostKeyChecking=no
# 密码: moshou99
cd /home/idea/code/qlib_t
ls -la
```

## 2. WebSocket服务实现

### 2.1 选择WebSocket框架
根据代码结构选择合适的WebSocket框架，可能的选项包括：
- FastAPI + WebSocket（如果已有FastAPI应用）
- Flask-SocketIO（如果已有Flask应用）
- 独立的WebSocket服务器（如aiohttp）

### 2.2 实现WebSocket服务

#### 2.2.1 服务端实现
```python
# 示例：使用FastAPI实现WebSocket服务
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

class ConnectionManager:
    def __init__(self):
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

manager = ConnectionManager()

@app.websocket("/ws/train/{task_id}")
async def websocket_train(websocket: WebSocket, task_id: str):
    await manager.connect(websocket, task_id)
    try:
        while True:
            # 接收客户端消息（可选）
            data = await websocket.receive_text()
            # 处理客户端消息（如果需要）
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, task_id)
```

#### 2.2.2 客户端调用接口
```python
# 示例：发送训练更新
async def send_training_update(task_id: str, status: str, progress: float, message: str):
    update = {
        "task_id": task_id,
        "status": status,
        "progress": progress,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    await manager.send_update(update, task_id)
```

## 3. 模型训练服务实现

### 3.1 设计训练服务架构

#### 3.1.1 服务组件
- **训练任务管理器**：负责任务的创建、调度和状态管理
- **模型训练引擎**：负责实际的模型训练过程
- **结果存储服务**：负责训练结果的存储和查询
- **WebSocket通知服务**：负责将训练状态实时推送给客户端

#### 3.1.2 数据模型
```python
class TrainingTask:
    id: str
    status: str  # pending, running, completed, failed, cancelled
    progress: float  # 0.0 to 100.0
    config: dict
    result: dict
    error: str
    created_at: datetime
    started_at: datetime
    completed_at: datetime
```

### 3.2 实现训练服务

#### 3.2.1 训练任务管理器
```python
class TrainingTaskManager:
    def __init__(self):
        self.tasks: dict[str, TrainingTask] = {}
        self.lock = Lock()
    
    def create_task(self, config: dict) -> str:
        """创建新的训练任务"""
        task_id = f"task-{uuid.uuid4()}"
        task = TrainingTask(
            id=task_id,
            status="pending",
            progress=0.0,
            config=config,
            result={},
            error="",
            created_at=datetime.now()
        )
        with self.lock:
            self.tasks[task_id] = task
        return task_id
    
    def get_task(self, task_id: str) -> Optional[TrainingTask]:
        """获取任务信息"""
        with self.lock:
            return self.tasks.get(task_id)
    
    def update_task(self, task_id: str, **kwargs) -> Optional[TrainingTask]:
        """更新任务信息"""
        with self.lock:
            task = self.tasks.get(task_id)
            if task:
                for key, value in kwargs.items():
                    setattr(task, key, value)
                # 发送WebSocket更新
                asyncio.create_task(send_training_update(
                    task_id=task_id,
                    status=task.status,
                    progress=task.progress,
                    message=f"Task {task.status} {task.progress:.1f}%"
                ))
            return task
```

#### 3.2.2 模型训练引擎
```python
async def train_model(task_id: str, config: dict):
    """训练模型"""
    task_manager = TrainingTaskManager()
    
    # 更新任务状态为运行中
    task_manager.update_task(
        task_id=task_id,
        status="running",
        started_at=datetime.now()
    )
    
    try:
        # 模拟模型训练过程
        for i in range(10):
            # 执行训练步骤
            await asyncio.sleep(2)  # 模拟训练耗时
            
            # 更新训练进度
            progress = (i + 1) * 10
            task_manager.update_task(
                task_id=task_id,
                progress=progress,
                message=f"Training step {i + 1}/10 completed"
            )
        
        # 训练完成
        task_manager.update_task(
            task_id=task_id,
            status="completed",
            progress=100.0,
            result={"accuracy": 0.95, "loss": 0.05},
            completed_at=datetime.now()
        )
    except Exception as e:
        # 训练失败
        task_manager.update_task(
            task_id=task_id,
            status="failed",
            error=str(e),
            completed_at=datetime.now()
        )
```

### 3.3 实现训练API

```python
@app.post("/api/train")
async def train_endpoint(config: dict):
    """创建训练任务的API端点"""
    task_manager = TrainingTaskManager()
    task_id = task_manager.create_task(config)
    
    # 异步执行训练任务
    asyncio.create_task(train_model(task_id, config))
    
    return {
        "task_id": task_id,
        "status": "success",
        "message": "Training task created successfully"
    }

@app.get("/api/tasks/{task_id}")
async def get_task_endpoint(task_id: str):
    """获取任务状态的API端点"""
    task_manager = TrainingTaskManager()
    task = task_manager.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task
```

## 4. 集成和测试

### 4.1 集成WebSocket和训练服务

1. **启动服务**：
   ```bash
   cd /home/idea/code/qlib_t
   # 安装依赖
   pip install -r requirements.txt
   # 启动服务
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **测试API**：
   ```bash
   # 创建训练任务
   curl -X POST -H "Content-Type: application/json" -d '{"test": "config"}' http://ddns.hoo.ink:8000/api/train
   
   # 获取任务状态
   curl http://ddns.hoo.ink:8000/api/tasks/{task_id}
   ```

3. **测试WebSocket**：
   ```bash
   # 使用wscat测试WebSocket
   wscat -c ws://ddns.hoo.ink:8000/ws/train/{task_id}
   ```

### 4.2 验证与优化

1. **验证功能完整性**：确保所有功能正常工作
2. **性能优化**：根据测试结果优化服务性能
3. **错误处理**：完善错误处理和日志记录
4. **安全性**：添加必要的身份验证和授权机制

## 5. 部署和维护

### 5.1 部署方案

1. **使用systemd管理服务**：
   ```bash
   # 创建systemd服务文件
   sudo nano /etc/systemd/system/qlib_train.service
   ```

   ```ini
   [Unit]
   Description=QLib Training Service
   After=network.target
   
   [Service]
   User=idea
   WorkingDirectory=/home/idea/code/qlib_t
   ExecStart=/usr/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
   Restart=always
   RestartSec=5
   
   [Install]
   WantedBy=multi-user.target
   ```

2. **启动服务**：
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable qlib_train
   sudo systemctl start qlib_train
   ```

### 5.2 监控和维护

1. **日志监控**：
   ```bash
   sudo journalctl -u qlib_train -f
   ```

2. **性能监控**：
   - 使用`top`或`htop`监控CPU和内存使用情况
   - 使用`netstat`或`ss`监控网络连接

3. **定期维护**：
   - 定期清理旧任务和日志
   - 定期更新依赖包
   - 定期备份重要数据

## 6. 预期成果

1. **WebSocket服务**：实现实时的训练状态推送
2. **模型训练服务**：实现完整的模型训练流程
3. **API端点**：提供创建任务、查询状态等API
4. **集成测试**：确保所有组件正常工作
5. **部署方案**：提供完整的部署和维护指南

通过以上实现，QLib分布式管理平台将具备完整的WebSocket通信和模型训练服务功能，能够满足实时训练状态监控和管理的需求。