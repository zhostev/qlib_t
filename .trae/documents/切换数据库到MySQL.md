# 将数据库从SQLite迁移到MySQL

## 需求分析
需要将数据库从本地SQLite改为阿里云MySQL数据库，连接信息如下：
- 主机：rm-bp146d0y4vo46bn72co.mysql.rds.aliyuncs.com
- 账号：hoo
- 密码：Moshou99
- 数据库：qlib_ai

## 现有配置分析
1. 数据库配置在 `/home/qlib_t/backend/app/db/database.py` 文件中
2. 使用 `DATABASE_URL` 环境变量来配置数据库连接
3. 默认使用 SQLite 数据库 `sqlite:///./test.db`
4. 项目已经安装了 `pymysql` 驱动（requirements.txt 中有 `pymysql>=1.0.0`）
5. 目前没有 `.env` 文件

## 实施计划

### 1. 创建 .env 文件
- 在 `/home/qlib_t/backend` 目录下创建 `.env` 文件
- 配置 MySQL 连接信息：
  ```
  DATABASE_URL=mysql+pymysql://hoo:Moshou99@rm-bp146d0y4vo46bn72co.mysql.rds.aliyuncs.com/qlib_ai
  SECRET_KEY=your-secret-key-here
  ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=30
  TRAINING_SERVER_URL=http://ddns.hoo.ink:8000
  TRAINING_SERVER_TIMEOUT=3600
  ```

### 2. 测试数据库连接
- 运行一个简单的脚本测试是否能够连接到MySQL数据库
- 确保数据库配置正确，没有语法错误

### 3. 初始化数据库表结构
- 运行 `python init_db.py` 初始化数据库表结构
- 这将创建所有必要的表和初始数据

### 4. 重启后端服务
- 确保后端服务使用新的MySQL数据库配置
- 重启服务以应用新的配置

### 5. 重启训练worker
- 确保训练worker使用新的MySQL数据库配置
- 重启worker以应用新的配置

### 6. 测试功能
- 使用现有测试脚本测试功能是否正常
- 确保所有API端点都能正常工作
- 测试训练功能是否正常

## 预期结果
- 数据库成功从SQLite迁移到MySQL
- 后端服务能够正常连接到MySQL数据库
- 训练worker能够正常连接到MySQL数据库
- 所有功能正常工作

## 注意事项
- 确保MySQL数据库已经创建，并且账号有足够的权限
- 确保网络连接正常，能够访问阿里云MySQL数据库
- 确保 `.env` 文件的权限设置正确，避免敏感信息泄露
- 测试过程中注意备份数据，避免数据丢失

## 后续优化建议
- 考虑使用数据库迁移工具（如Alembic）来管理数据库 schema 变更
- 添加数据库连接池配置，优化数据库性能
- 考虑添加数据库监控和告警机制
- 定期备份数据库，确保数据安全