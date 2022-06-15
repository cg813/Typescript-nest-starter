FROM node:12-alpine as BUILDER
ARG BUILD_ENVIRONMENT

RUN mkdir /app
WORKDIR /app

COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
RUN npm ci --unsafe
COPY . /app
RUN npm run "compile:${BUILD_ENVIRONMENT}"


##
FROM node:12-alpine
ARG BUILD_ENVIRONMENT

RUN mkdir /app \
  && chown -R node:node /app \
  && mkdir /data \
  && chown -R node:node /data

WORKDIR /app

COPY --chown=node --from=BUILDER /app/package.json /app/package.json
COPY --chown=node --from=BUILDER /app/package-lock.json /app/package-lock.json
RUN npm ci --unsafe --production \
    && npm cache clean --force \
    && chown node:node -R node_modules
COPY --chown=node --from=BUILDER /app/build /app/build
COPY --chown=node --from=BUILDER /app/nest-cli.json /app/nest-cli.json

VOLUME ["/data"]

USER node

EXPOSE 8080

ENV BUILD_ENVIRONMENT ${BUILD_ENVIRONMENT}
CMD npm run "start:${BUILD_ENVIRONMENT}"
