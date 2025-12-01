## QLib全栈阿里云部署与免密数据同步计划

### 当前项目状态
1. **前端**：React + Vite构建，已生成dist目录，开发环境API代理指向http://localhost:8000
2. **后端**：FastAPI服务，已启动运行在http://localhost:8000，CORS已配置允许阿里云地址http://116.62.59.244
3. **模型训练**：两个train_worker.py进程正在运行

### 部署目标
- 从指定GitHub仓库拉取代码到阿里云服务器
- 前端、后端和模型训练全栈部署到阿里云服务器（116.62.59.244）
- 实现本地与阿里云之间的免密数据同步
- 确保所有服务稳定运行，资源充足

### 部署步骤

#### 1. 阿里云服务器环境准备
- 登录阿里云服务器（116.62.59.244）
- 安装必要的软件：Node.js、Python、Nginx、Git、rsync等
- 配置服务器防火墙，开放必要端口（80、443、8000等）

#### 2. 免密SSH配置
- **生成SSH密钥对**：在本地机器执行`ssh-keygen -t rsa`生成密钥对
- **配置免密登录**：将本地公钥（~/.ssh/id_rsa.pub）复制到阿里云服务器的~/.ssh/authorized_keys文件中
- **验证免密登录**：执行`ssh root@116.62.59.244`验证是否可以免密登录

#### 3. 从指定GitHub仓库拉取代码
- 在阿里云服务器上创建项目目录：`mkdir -p /home/qlib_t && cd /home/qlib_t`
- 从指定GitHub仓库和分支拉取代码：`git clone -b dev1201 https://github.com/zhostev/qlib_t.git .`
- 验证代码拉取成功：`git branch`确认当前分支为dev1201

#### 4. 安装项目依赖
- **前端依赖**：`cd frontend && npm install`
- **后端依赖**：`cd ../backend && pip install -r requirements.txt`

#### 5. 前端配置与构建
- 修改前端生产环境API请求地址，指向阿里云本地后端服务（http://localhost:8000）
- 构建前端项目：`npm run build`
- 配置Nginx，将前端静态文件部署到80端口：
  - 复制nginx.conf到/etc/nginx/conf.d/目录
  - 重启Nginx服务：`systemctl restart nginx`

#### 6. 后端配置与启动
- 配置后端环境变量（数据库连接、端口等）
- 初始化数据库：`python init_db.py`
- 创建管理员用户：`python create_admin.py`
- 使用进程管理工具（如Supervisor）配置后端服务：
  - 创建Supervisor配置文件：`/etc/supervisor/conf.d/qlib_backend.conf`
  - 配置内容：
    ```
    [program:qlib_backend]
    command=uvicorn main:app --host 0.0.0.0 --port 8000
    directory=/home/qlib_t/backend
    autostart=true
    autorestart=true
    stderr_logfile=/var/log/qlib_backend.err.log
    stdout_logfile=/var/log/qlib_backend.out.log
    ```
  - 启动后端服务：`supervisorctl update && supervisorctl start qlib_backend`

#### 7. 模型训练部署
- 使用Supervisor配置模型训练进程：
  - 创建Supervisor配置文件：`/etc/supervisor/conf.d/qlib_train_worker.conf`
  - 配置内容：
    ```
    [program:qlib_train_worker1]
    command=python train_worker.py
    directory=/home/qlib_t/backend
    autostart=true
    autorestart=true
    stderr_logfile=/var/log/qlib_train_worker1.err.log
    stdout_logfile=/var/log/qlib_train_worker1.out.log
    
    [program:qlib_train_worker2]
    command=python train_worker.py
    directory=/home/qlib_t/backend
    autostart=true
    autorestart=true
    stderr_logfile=/var/log/qlib_train_worker2.err.log
    stdout_logfile=/var/log/qlib_train_worker2.out.log
    ```
  - 启动模型训练进程：`supervisorctl update && supervisorctl start qlib_train_worker:*`

#### 8. 免密数据同步配置
- **创建同步脚本**：在本地机器创建rsync同步脚本，用于本地与阿里云之间的数据同步
- **配置同步目录**：确定需要同步的目录，如模型文件、实验数据、日志等
- **设置同步方向**：
  - 本地 → 阿里云：模型文件、配置文件等
  - 阿里云 → 本地：实验结果、日志等
- **配置定时同步**：使用crontab设置定时同步任务，确保数据实时更新
  - 示例：`0 */6 * * * rsync -avz --delete /local/path/ root@116.62.59.244:/remote/path/`
- **验证同步效果**：执行同步脚本，验证数据是否成功同步

#### 9. 验证部署
- 访问阿里云前端地址（http://116.62.59.244），验证页面加载正常
- 测试前端与后端的API通信，确保数据交互正常
- 验证模型训练功能正常运行
- 测试实验创建、运行、结果查看等完整流程
- 验证本地与阿里云之间的数据同步正常

### 预期结果
- 成功从指定GitHub仓库拉取代码到阿里云服务器
- 前端成功部署到阿里云，可通过http://116.62.59.244访问
- 后端服务在阿里云稳定运行，处理前端请求
- 模型训练在阿里云服务器上运行，资源充足，不会导致卡顿
- 本地与阿里云之间实现免密数据同步，数据实时更新
- 所有服务之间通信正常，实现完整功能

### 技术要点
- 从指定GitHub仓库和分支拉取代码
- 前后端通过RESTful API通信
- 前端使用Nginx部署静态文件
- 后端使用Uvicorn运行FastAPI服务
- 模型训练进程与后端服务通过内部通信
- 使用SSH密钥对实现免密登录和数据同步
- 使用rsync工具实现高效的数据同步
- 使用Supervisor管理服务进程，确保稳定运行
- 使用crontab设置定时同步任务