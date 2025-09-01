# ===============================
# 1️⃣ Builder Stage
# ===============================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_URL_MENU
ARG VITE_API_KEY
ARG VITE_SEND_ORDER_URL
ARG VITE_SAVE_ORDER_URL

# Set them as environment variables for the build process
ENV VITE_API_URL_MENU=$VITE_API_URL_MENU
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_SEND_ORDER_URL=$VITE_SEND_ORDER_URL
ENV VITE_SAVE_ORDER_URL=$VITE_SAVE_ORDER_URL

# Debug: Print environment variables during build (optional - remove in production)
RUN echo "Build-time environment variables:"
RUN echo "VITE_API_URL_MENU: $VITE_API_URL_MENU"
RUN echo "VITE_API_KEY: $VITE_API_KEY"
RUN echo "VITE_SEND_ORDER_URL: $VITE_SEND_ORDER_URL"
RUN echo "VITE_SAVE_ORDER_URL: $VITE_SAVE_ORDER_URL"

# Install dependencies including devDependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Build the app (uses devDependencies like vite)
RUN npm run build

# ===============================
# 2️⃣ Production Stage
# ===============================
FROM nginx:alpine AS runner

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built application from builder
COPY --from=builder /app/dist ./

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]