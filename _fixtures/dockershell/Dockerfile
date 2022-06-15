# buster is required to have a correct minimum Git version for husky
ARG NODE_VERSION
FROM node:${NODE_VERSION}-buster

RUN mkdir /app \
  && chown -R node:node /app \
  && apt-get update \
  && apt-get install -y nano bash-completion \
  && npm completion > /etc/bash_completion.d/npm

ARG NPM_VERSION
ARG NESTJS_VERSION
RUN npm install -g "npm@^${NPM_VERSION}" \
    && npm install -g "@nestjs/cli@^${NESTJS_VERSION}"

WORKDIR /app
