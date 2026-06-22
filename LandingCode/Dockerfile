FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Use Nginx to serve the static HTML files
FROM nginx:alpine AS runner

# Copy the static export from builder to nginx html folder
COPY --from=builder /app/out /usr/share/nginx/html

# Use custom nginx config for clean URLs and security headers
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (internal)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
