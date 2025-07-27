FROM node:22-alpine
RUN mkdir -p /usr/src/api/src/types

COPY --from=api:1 /usr/src/api/src/types /usr/src/api/src/types

RUN mkdir -p /usr/src/tool
WORKDIR /usr/src/tool
COPY . .

RUN npm i
RUN npm run build
RUN chown -R node /usr/src/tool
USER node
EXPOSE ${PORT}
CMD ["npm", "run", "serve"]