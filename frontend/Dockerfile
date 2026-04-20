FROM node:24-slim

WORKDIR /app

# Install dependencies separately to leverage Docker layer caching
COPY package.json ./
RUN npm install

# Copy source after deps are cached
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
