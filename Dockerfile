# ===============================
# 1️⃣ Build Stage
# ===============================
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build args for environment variables
ARG VITE_API_URL_MENU
ARG VITE_API_KEY
ARG VITE_TABLE_TAP_URL 
ARG VITE_APP_MODE
ARG VITE_TABLE_ID
ARG VITE_API_GATEWAY_URL
ARG VITE_COGNITO_POOL_ID
ARG VITE_LEX_BOT_ID
ARG VITE_LEX_BOT_ALIAS_ID
ARG VITE_LEX_BOT_LOCALE_ID
ARG VITE_STRIPE_PUBLISHABLE_KEY

# Expose arguments as environment variables for the build process
ENV VITE_API_URL_MENU=$VITE_API_URL_MENU
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_TABLE_TAP_URL=$VITE_TABLE_TAP_URL
ENV VITE_APP_MODE=$VITE_APP_MODE
ENV VITE_TABLE_ID=$VITE_TABLE_ID
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_COGNITO_POOL_ID=$VITE_COGNITO_POOL_ID
ENV VITE_LEX_BOT_ID=$VITE_LEX_BOT_ID
ENV VITE_LEX_BOT_ALIAS_ID=$VITE_LEX_BOT_ALIAS_ID
ENV VITE_LEX_BOT_LOCALE_ID=$VITE_LEX_BOT_LOCALE_ID
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# ===============================
# 2️⃣ Production Stage
# ===============================
FROM nginxinc/nginx-otel:alpine-slim AS runner

WORKDIR /usr/share/nginx/html

# Remove default nginx assets
RUN rm -rf ./*

# Copy built app from builder
COPY --from=builder /app/dist ./

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Optional: Add runtime OTEL configuration via environment variables
ENV OTEL_EXPORTER_OTLP_ENDPOINT="tabletap-monitor.taila459ef.ts.net:4317"
ENV OTEL_SERVICE_NAME="table-app"

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]