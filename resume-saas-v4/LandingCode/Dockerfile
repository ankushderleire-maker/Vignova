FROM node:18-alpine AS builder

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

# Expose port (internal)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
