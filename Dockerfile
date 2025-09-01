# ===============================
# 1️⃣ Builder Stage
# ===============================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

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
