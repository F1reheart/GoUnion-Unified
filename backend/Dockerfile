FROM node:20-alpine

WORKDIR /app

# Install dependencies
# Using --omit=dev ensures we don't install devDependencies in production
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY . .

# Expose the API port
EXPOSE 8001

# Start the Express server
CMD ["npm", "start"]
