# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application with production flag
RUN npm run build

# Stage 2: Create a lightweight production image
FROM node:20-alpine AS production

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install both production and development dependencies
# This is needed because the built server code still references vite
RUN npm ci --omit=dev && npm install vite

# Copy built files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port
EXPOSE 5000

# Start the application
CMD ["node", "dist/index.js"] 