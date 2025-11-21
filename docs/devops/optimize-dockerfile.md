---
outline: deep
---

# Common Dockerfile Mistakes and Practical Image Optimization Tips

Docker has become an essential tool in modern DevOps workflows, but writing efficient Dockerfiles is often overlooked. This guide covers common mistakes developers make and provides practical optimization techniques to create smaller, faster, and more secure container images.

## Common Dockerfile Mistakes

### 1. Using Latest Tag

::: danger Anti-pattern

```dockerfile
FROM node:latest
FROM ubuntu:latest
```

:::

**Problem:** The `latest` tag is mutable and can break your builds unpredictably. Your image might work today but fail tomorrow when a new version is released.

**Solution:** Always use specific version tags or SHA digests:

```dockerfile
# Good - Specific version
FROM node:20.11.0-alpine

# Better - SHA digest (most secure)
FROM node@sha256:abc123def456...
```

### 2. Not Leveraging Layer Caching

::: warning Common Mistake

```dockerfile
FROM node:20-alpine
COPY . .
RUN npm install
RUN npm run build
```

:::

**Problem:** Every code change invalidates the cache, forcing `npm install` to run again even when dependencies haven't changed.

**Solution:** Copy dependency files first, then install, and finally copy application code:

```dockerfile
FROM node:20-alpine

# Copy package files first
COPY package*.json ./

# Install dependencies (cached unless package.json changes)
RUN npm ci --only=production

# Copy application code (changes frequently)
COPY . .

# Build application
RUN npm run build
```

### 3. Running as Root User

::: danger Security Risk

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y nginx
CMD ["nginx", "-g", "daemon off;"]
```

:::

**Problem:** Containers run as root by default, which is a security risk. If the container is compromised, attackers have root access.

**Solution:** Create and use a non-root user:

```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Change ownership
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

CMD ["node", "index.js"]
```

### 4. Including Unnecessary Files

::: warning Bloat Issue

```dockerfile
FROM node:20-alpine
COPY . .
```

:::

**Problem:** Copying everything (including `.git`, `node_modules`, test files) increases image size and build time.

**Solution:** Use `.dockerignore` file:

```txt
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
.env
.nyc_output
coverage
.vscode
*.md
.DS_Store
```

### 5. Not Cleaning Up Package Managers

```dockerfile
FROM ubuntu:22.04
RUN apt-get update
RUN apt-get install -y python3 python3-pip
RUN pip3 install flask
```

**Problem:** Package manager caches and temporary files remain in the image, increasing size.

**Solution:** Clean up in the same RUN command:

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip && \
    pip3 install --no-cache-dir flask && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 6. Using Multiple RUN Commands

```dockerfile
FROM ubuntu:22.04
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y wget
RUN apt-get install -y git
```

**Problem:** Each RUN creates a new layer, increasing image size.

**Solution:** Combine commands in a single RUN:

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    wget \
    git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 7. Exposing Unnecessary Ports

```dockerfile
EXPOSE 80 443 8080 3000 5000
```

**Problem:** Exposing multiple ports when only one is needed creates confusion and potential security issues.

**Solution:** Only expose the ports your application actually uses:

```dockerfile
EXPOSE 3000
```

## Practical Image Optimization Tips

### 1. Use Multi-stage Builds

Multi-stage builds allow you to use multiple base images and copy only what you need into the final image.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy only production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

USER nodejs
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

::: tip Benefit
This reduces the final image size by excluding build tools, source code, and dev dependencies.
:::

### 2. Choose the Right Base Image

**Alpine Linux** is popular for its small size (~5MB), but consider your needs:

```dockerfile
# Alpine - Smallest (~5MB)
FROM node:20-alpine

# Distroless - Minimal, secure (~20MB)
FROM gcr.io/distroless/nodejs20-debian12

# Debian Slim - Balanced (~50MB)
FROM node:20-slim

# Full Debian - Largest (~100MB+)
FROM node:20
```

::: info Comparison

- **Alpine**: Smallest, but uses musl libc (compatibility issues possible)
- **Distroless**: Very secure, no shell/package manager, but harder to debug
- **Debian Slim**: Good balance of size and compatibility
- **Full Debian**: Largest, but most compatible
  :::

### 3. Optimize Layer Ordering

Order your Dockerfile instructions from least to most frequently changing:

```dockerfile
# 1. Base image (rarely changes)
FROM node:20-alpine

# 2. System packages (rarely changes)
RUN apk add --no-cache dumb-init

# 3. Application dependencies (changes occasionally)
COPY package*.json ./
RUN npm ci --only=production

# 4. Application code (changes frequently)
COPY . .

# 5. Runtime configuration (changes frequently)
ENV NODE_ENV=production
CMD ["dumb-init", "node", "index.js"]
```

### 4. Use .dockerignore Effectively

Create a comprehensive `.dockerignore`:

```txt
# Dependencies
node_modules
npm-debug.log
yarn-error.log

# Version control
.git
.gitignore
.gitattributes

# IDE
.vscode
.idea
*.swp
*.swo

# Environment files
.env
.env.local
.env.*.local

# Testing
coverage
.nyc_output
*.test.js
*.spec.js

# Documentation
*.md
docs/
README.md

# Build artifacts
dist/
build/
*.log

# OS files
.DS_Store
Thumbs.db
```

### 5. Minimize Image Layers

Combine related operations:

```dockerfile
# Bad - Multiple layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# Good - Single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 6. Use Specific Package Versions

```dockerfile
# Bad - Latest version
RUN pip install flask requests

# Good - Specific versions
RUN pip install flask==3.0.0 requests==2.31.0
```

### 7. Leverage BuildKit Cache Mounts

Use BuildKit's cache mounts for package managers:

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20-alpine

# Cache npm dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production
```

### 8. Remove Unnecessary Files

Clean up temporary files and caches:

```dockerfile
FROM node:20-alpine
RUN npm install && \
    npm run build && \
    npm prune --production && \
    rm -rf /tmp/* && \
    rm -rf /var/cache/apk/*
```

### 9. Use Health Checks

Add health checks for better container orchestration:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 10. Optimize for Your Use Case

**For Python applications:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run as non-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

CMD ["python", "app.py"]
```

**For Go applications:**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
CMD ["./server"]
```

## Best Practices Summary

::: tip Checklist

- ✅ Use specific version tags, not `latest`
- ✅ Leverage layer caching with proper instruction order
- ✅ Run containers as non-root users
- ✅ Use `.dockerignore` to exclude unnecessary files
- ✅ Combine RUN commands to minimize layers
- ✅ Clean up package manager caches
- ✅ Use multi-stage builds for compiled languages
- ✅ Choose appropriate base images (Alpine, Slim, etc.)
- ✅ Add health checks for production deployments
- ✅ Use BuildKit cache mounts for faster builds
  :::

## Measuring Image Size

Compare image sizes before and after optimization:

```bash
# Build image
docker build -t myapp:optimized .

# Check image size
docker images myapp:optimized

# Analyze image layers
docker history myapp:optimized

# Use dive for detailed analysis
dive myapp:optimized
```

## Conclusion

Optimizing Dockerfiles is an iterative process. Start with the basics:

1. Fix common mistakes
2. Implement multi-stage builds
3. Use appropriate base images
4. Leverage caching effectively

Remember: smaller images mean faster deployments, lower storage costs, and improved security. Take time to optimize your Dockerfiles—your infrastructure will thank you!

::: details Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Dive - Image Analysis Tool](https://github.com/wagoodman/dive)
- [Distroless Images](https://github.com/GoogleContainerTools/distroless)
  :::
