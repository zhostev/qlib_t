# QLib项目部署计划

## 1. 部署概述

本计划旨在将本地QLib项目代码部署到阿里云服务器（116.62.59.244），实现web服务的更新和重启，并将前端域名配置为qlib.hoo.ink。

## 2. 部署环境

- **本地服务器**：任务训练服务器，ddns.hoo.ink
- **阿里云服务器**：116.62.59.244，root用户，已配置免密登录
- **项目分支**：dev1201
- **前端域名**：qlib.hoo.ink
- **后端API端口**：8000

## 3. 部署步骤

### 3.1 本地代码准备

1. **提交本地修改**：将本地未提交的代码提交到GitHub仓库
2. **推送代码**：将本地代码推送到远程仓库

### 3.2 阿里云服务器部署

1. **登录阿里云服务器**：使用免密登录方式登录
2. **拉取最新代码**：从GitHub仓库拉取最新代码
3. **构建前端项目**：重新构建前端静态文件
4. **更新Nginx配置**：将前端域名从IP地址改为qlib.hoo.ink
5. **重启后端服务**：使用Supervisor重启后端服务
6. **重启模型训练进程**：使用Supervisor重启模型训练进程
7. **重启Nginx服务**：确保Nginx正确加载新的配置和前端文件

## 4. 详细部署命令

### 4.1 本地操作

```bash
# 进入项目目录
cd /home/idea/code/qlib_t

# 提交本地修改
git add .
git commit -m "Update code for deployment"

# 推送代码到远程仓库
git push origin dev1201
```

### 4.2 阿里云服务器操作

```bash
# 登录阿里云服务器
ssh root@116.62.59.244

# 进入项目目录
cd /home/qlib_t

# 拉取最新代码
git pull origin dev1201

# 构建前端项目
cd /home/qlib_t/frontend
npm run build

# 更新Nginx配置
sed -i 's/server_name 116.62.59.244;/server_name 116.62.59.244 qlib.hoo.ink;/' /etc/nginx/conf.d/qlib.conf

# 检查Nginx配置
nginx -t

# 重启后端服务
supervisorctl restart qlib_backend

# 重启模型训练进程
supervisorctl restart qlib_model_train

# 重启Nginx服务
systemctl restart nginx
```

## 5. 验证部署

1. **访问前端页面**：http://qlib.hoo.ink
2. **访问后端API**：http://qlib.hoo.ink/api
3. **查看服务状态**：
   - `supervisorctl status`
   - `systemctl status nginx`
4. **查看日志**：
   - 后端日志：`tail -n 50 /var/log/qlib_backend.err.log`
   - 模型训练日志：`tail -n 50 /var/log/qlib_model_train.err.log`
   - Nginx日志：`tail -n 50 /var/log/nginx/error.log`

## 6. 回滚方案

如果部署出现问题，可以执行以下回滚操作：

1. **回滚代码**：
   ```bash
   cd /home/qlib_t
   git checkout <previous_commit_hash>
   ```

2. **重新构建前端**：
   ```bash
   cd /home/qlib_t/frontend
   npm run build
   ```

3. **恢复Nginx配置**：
   ```bash
   sed -i 's/server_name 116.62.59.244 qlib.hoo.ink;/server_name 116.62.59.244;/' /etc/nginx/conf.d/qlib.conf
   nginx -t
   ```

4. **重启服务**：
   ```bash
   supervisorctl restart qlib_backend
   supervisorctl restart qlib_model_train
   systemctl restart nginx
   ```

## 7. 注意事项

1. 确保本地代码已经测试通过，没有引入新的bug
2. 部署过程中可能会导致服务短暂不可用，建议在低峰期进行部署
3. 部署完成后，及时验证服务是否正常运行
4. 定期备份数据库和重要配置文件
5. 确保域名qlib.hoo.ink已经正确解析到服务器IP地址116.62.59.244

## 8. 部署时间

建议在业务低峰期进行部署，预计部署时间约为10-15分钟。