# =============================================================================
# Socket Server Dockerfile - Gestão de Agências
# =============================================================================

FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy ONLY the Socket Server package.json
COPY package-socket.json ./package.json

# Install only Socket Server dependencies
RUN npm install --production --no-optional && npm cache clean --force

# Copy server files
COPY socket-server.js ./
COPY .baileys-auth .baileys-auth

# Create logs directory
RUN mkdir -p logs

# Expose socket port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Socket server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "socket-server.js"]
