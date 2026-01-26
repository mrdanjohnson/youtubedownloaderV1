# Backend Dockerfile
FROM node:20-alpine

# Install Python, yt-dlp, and OpenSSL dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg openssl && \
    pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy TypeScript source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size (optional)
RUN npm prune --production

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
ENTRYPOINT ["docker-entrypoint.sh"]
