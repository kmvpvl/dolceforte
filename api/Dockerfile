FROM node:22-alpine
RUN mkdir -p /usr/src/api
WORKDIR /usr/src/api
COPY . .
RUN npm i
RUN npm run build
RUN chown -R node /usr/src/api
USER node
EXPOSE ${PORT}
CMD ["npm", "run", "start"]