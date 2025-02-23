FROM node:18-alpine

COPY . .

RUN npm install -g pnpm

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
