FROM node:19.3.0-alpine

WORKDIR /src/app

COPY package*.json ./

RUN yarn install

COPY . .

CMD [ "node", "build/app.js" ]
