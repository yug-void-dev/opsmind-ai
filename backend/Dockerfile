# ══════════════════════════════════════════════════════════════
# OpsMind AI — Multi-Stage Dockerfile
# Stage 1 (builder):    install production deps with npm ci
# Stage 2 (production): minimal runtime image, non-root user
# ══════════════════════════════════════════════════════════════

# ─── Stage 1: Dependency Builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lock files first for optimal layer caching
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser  -G appgroup

WORKDIR /app

# Copy production deps from builder stage
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy source — scripts go in too (for npm run setup / seed)
COPY --chown=appuser:appgroup src/       ./src/
COPY --chown=appuser:appgroup scripts/   ./scripts/
COPY --chown=appuser:appgroup package*.json ./

# Create required directories with correct ownership
RUN mkdir -p uploads logs && \
    chown -R appuser:appgroup /app

# Drop to non-root
USER appuser

# Port
EXPOSE 5000

# Health check — Docker will restart the container if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start
CMD ["node", "src/server.js"]
