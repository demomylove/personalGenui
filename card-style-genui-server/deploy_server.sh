#!/bin/bash
set -e

# 确保在脚本所在目录执行
cd "$(dirname "$0")"

echo "Using AMD64 architecture for production build..."

# 生产环境镜像构建 (AMD64) 并推送
docker buildx build --no-cache --platform linux/amd64 --push --provenance=false \
       --build-arg NODE_BASE=docker.m.daocloud.io/library/node:18-alpine \
       -t registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest .

# (Optional) Clean up local image if needed, though buildx manages its own cache.

echo "Build and Push Complete."
