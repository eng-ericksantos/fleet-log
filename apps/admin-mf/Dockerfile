FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4201", "--poll", "2000", "--disable-host-check"]
