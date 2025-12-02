# 在DDNS服务器上启动模型训练任务

## 需求分析
需要在DDNS服务器（ddns.hoo.ink:8000）上启动模型训练任务，与本地服务器的后端解耦。

## 现有配置分析
1. 系统已经配置了`TRAINING_SERVER_URL`为`http://ddns.hoo.ink:8000`
2. 后端使用FastAPI构建，运行在8000端口
3. 训练任务通过`train_worker.py`执行，从数据库获取待处理任务
4. 使用SQLite数据库（默认`test.db`）
5. CORS设置中包含了`http://qlib.hoo.ink`，但缺少`http://ddns.hoo.ink:8000`

## 实施计划

### 1. 更新CORS配置
- 修改`main.py`中的CORS设置，添加`http://ddns.hoo.ink:8000`到允许的源列表

### 2. 启动后端服务
- 确保后端服务运行在DDNS服务器的8000端口
- 可以使用`uvicorn main:app --host 0.0.0.0 --port 8000 --reload`命令启动

### 3. 启动训练worker
- 运行`python train_worker.py`启动训练任务执行器
- 训练worker会自动从数据库获取待处理任务并执行

### 4. 测试训练功能
- 使用现有的测试脚本测试训练功能：
  - `test_training_client.py` - 测试客户端连接
  - `test_training_api.py` - 测试API调用
  - `test_simple_training.py` - 简单训练测试
  - `test_auth_training.py` - 带认证的训练测试

### 5. 验证解耦效果
- 确保本地服务器可以通过DDNS URL访问训练服务
- 验证训练任务能够在DDNS服务器上独立执行

## 预期结果
- 后端服务成功运行在DDNS服务器的8000端口
- 训练worker成功启动并能够执行训练任务
- 本地服务器可以通过`http://ddns.hoo.ink:8000`访问训练服务
- 训练任务与本地后端成功解耦

## 注意事项
- 确保DDNS服务器的8000端口已经开放
- 确保数据库文件（test.db）在DDNS服务器上可访问
- 定期检查训练worker的运行状态
- 监控训练任务的执行情况

## 后续优化建议
- 考虑使用更可靠的数据库（如PostgreSQL）替代SQLite
- 添加训练任务的日志监控和告警机制
- 实现训练任务的分布式执行
- 添加训练资源的动态调度