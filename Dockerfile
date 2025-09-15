# ===============================
# 1️⃣ Build Stage
# ===============================
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build args for environment variables
ARG VITE_API_URL_MENU
ARG VITE_API_KEY
ARG VITE_SEND_ORDER_URL
ARG VITE_SAVE_ORDER_URL
ARG VITE_APP_MODE # <-- ADD THIS: To know if it's dine-in or takeout
ARG VITE_TABLE_ID # <-- ADD THIS: To know the specific table

# Expose arguments as environment variables for the build process
ENV VITE_API_URL_MENU=$VITE_API_URL_MENU
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_SEND_ORDER_URL=$VITE_SEND_ORDER_URL
ENV VITE_SAVE_ORDER_URL=$VITE_SAVE_ORDER_URL
ENV VITE_APP_MODE=$VITE_APP_MODE # <-- ADD THIS
ENV VITE_TABLE_ID=$VITE_TABLE_ID # <-- ADD THIS

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

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]