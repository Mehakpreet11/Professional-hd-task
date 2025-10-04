FROM node:20-alpine
WORKDIR /app

# copy only manifests first
COPY package*.json ./

# use install (tolerates lock mismatch) and skip dev deps for runtime image
RUN npm install --omit=dev

# now copy the rest of the source
COPY . .

ENV PORT=5000
EXPOSE 5000
CMD ["node","app.js"]
