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

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ===============================
# 2️⃣ Production Stage with OTEL
# ===============================
# Use NGINX 1.28 to match the OTEL module version
FROM nginx:1.28-alpine AS runner

# Add NGINX repository and install OTEL module
RUN set -x \
    && apk add --no-cache --virtual .build-deps \
        curl \
    # Add NGINX signing key
    && curl -o /tmp/nginx_signing.rsa.pub https://nginx.org/keys/nginx_signing.rsa.pub \
    && mv /tmp/nginx_signing.rsa.pub /etc/apk/keys/ \
    # Add NGINX repository
    && printf "%s%s%s\n" \
        "http://nginx.org/packages/alpine/v" \
        $(egrep -o '^[0-9]+\.[0-9]+' /etc/alpine-release) \
        "/main" \
    | tee -a /etc/apk/repositories \
    # Update and install nginx-module-otel
    && apk update \
    && apk add nginx-module-otel \
    # Cleanup
    && apk del .build-deps

WORKDIR /usr/share/nginx/html

# Remove default nginx assets
RUN rm -rf ./*

# Copy built app from builder
COPY --from=builder /app/dist ./

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]