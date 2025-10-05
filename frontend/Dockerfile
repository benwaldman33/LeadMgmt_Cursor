FROM node:18-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the Vite dev server (stable on bullseye) with proxy support
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]