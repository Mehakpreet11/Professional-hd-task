FROM node:20-alpine
WORKDIR /app

# With context set to backend/, these files are at the root of the context
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY . .

ENV PORT=5000
EXPOSE 5000
CMD ["node", "app.js"]
