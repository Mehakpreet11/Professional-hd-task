FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev=false
COPY . .
# If you have a build step (e.g., TypeScript), run it here:
# RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app ./
EXPOSE 5000
CMD ["npm","start"]
