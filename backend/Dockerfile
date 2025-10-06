FROM node:20-alpine

WORKDIR /app

# Install system dependencies including OpenSSL
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"] 