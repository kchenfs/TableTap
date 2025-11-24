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

# 2️⃣ Production Stage
# ===============================
FROM nginx:alpine AS runner

# 1. Install the "Hearing Aid" (OpenTelemetry Module)
RUN apk add --no-cache nginx-module-otel

WORKDIR /usr/share/nginx/html

# Remove default nginx assets
RUN rm -rf ./*

# Copy built app from builder
COPY --from=builder /app/dist ./

# 2. COPY TO THE MASTER LOCATION (Overwriting the main config)
# Note: We are copying to /etc/nginx/nginx.conf, NOT /conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]