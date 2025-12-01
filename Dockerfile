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
FROM nginx:alpine AS runner

WORKDIR /usr/share/nginx/html

# Remove default nginx assets
RUN rm -rf ./*

# Copy built app from builder
COPY --from=builder /app/dist ./

# Copy custom nginx configuration
# 1. Main config (global settings) -> /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

# 2. Site config (server block) -> /etc/nginx/conf.d/default.conf
COPY nginx-site.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# --- FIX: Ensure permissions for the config file ---
# We create a dummy config.js and give ownership to the nginx user so it can be overwritten at runtime.
RUN touch /usr/share/nginx/html/config.js && \
    chown nginx:nginx /usr/share/nginx/html/config.js && \
    chmod 777 /usr/share/nginx/html/config.js

# Start nginx with runtime configuration injection
CMD ["/bin/sh", "-c", "echo \"window.ENV = { TABLE_ID: '$VITE_TABLE_ID' };\" > /usr/share/nginx/html/config.js && nginx -g 'daemon off;'"]