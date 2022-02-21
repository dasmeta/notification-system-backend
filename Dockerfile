FROM node:12-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY . .

RUN yarn install --frozen-lockfile
RUN yarn build

CMD ["yarn", "start"]
