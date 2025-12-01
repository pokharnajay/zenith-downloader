#!/bin/bash

# Docker Hub Configuration
DOCKER_USERNAME="jaypokharna"
IMAGE_NAME="zenith-downloader"
VERSION="latest"

# Platform configuration - supports linux/amd64 (x86_64) and linux/arm64
PLATFORMS="linux/amd64,linux/arm64"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting multi-platform Docker build and push process...${NC}\n"
echo -e "${BLUE}Platforms: ${PLATFORMS}${NC}\n"

# Step 1: Login to Docker Hub (login first for buildx push)
echo -e "${BLUE}Step 1: Logging in to Docker Hub...${NC}"
docker login

if [ $? -ne 0 ]; then
    echo -e "${RED}Login failed! Exiting...${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Login successful!${NC}\n"

# Step 2: Create/use buildx builder for multi-platform builds
echo -e "${BLUE}Step 2: Setting up buildx builder...${NC}"
docker buildx create --name multiplatform-builder --use 2>/dev/null || docker buildx use multiplatform-builder

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create/use buildx builder! Exiting...${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Buildx builder ready!${NC}\n"

# Step 3: Build and push multi-platform image
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
echo -e "${BLUE}Step 3: Building and pushing multi-platform Docker image...${NC}"
echo -e "${BLUE}This will create images for: ${PLATFORMS}${NC}\n"

docker buildx build \
    --platform ${PLATFORMS} \
    --tag ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} \
    --tag ${DOCKER_USERNAME}/${IMAGE_NAME}:${TIMESTAMP} \
    --push \
    .

if [ $? -ne 0 ]; then
    echo -e "${RED}Build/Push failed! Exiting...${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Multi-platform build and push successful!${NC}\n"

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Docker image built and pushed successfully!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "Image: ${BLUE}${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}${NC}"
echo -e "Backup: ${BLUE}${DOCKER_USERNAME}/${IMAGE_NAME}:${TIMESTAMP}${NC}\n"
echo -e "${BLUE}To deploy on your servers, run:${NC}"
echo -e "  docker pull ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo -e "  docker-compose -f docker-compose.prod.yml up -d\n"
