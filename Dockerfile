FROM node:12-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY . .
COPY .env.prod .env
RUN yarn
RUN yarn build

CMD ["yarn", "start"]
