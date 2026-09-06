FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# Use npm ci with legacy peer deps to avoid strict peer dependency conflicts
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]