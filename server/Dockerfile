# =============================================================================
# Socket Server Dockerfile - Gestão de Agências
# =============================================================================

FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --production --no-optional && npm cache clean --force

# Copy server files
COPY socket-server.js ./
COPY baileys-db-auth.js ./

# Create logs directory
RUN mkdir -p logs

# Railway assigns PORT dynamically — expose default as fallback
EXPOSE ${PORT:-3001}

# Health check (uses PORT env var)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "const p=process.env.PORT||3001;require('http').get('http://localhost:'+p+'/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

# Start Socket server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "socket-server.js"]
