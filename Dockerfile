FROM node:20-bookworm-slim

# Install minimal tools for native dependencies (tfjs-node, sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates curl git python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source and models
COPY . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["npm", "start"]


