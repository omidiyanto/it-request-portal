# Stage 1: Build the application
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application with production flag
RUN npm run build && npm install

# Expose the port
EXPOSE 5000

# Start the application
CMD ["npm", "start"] 