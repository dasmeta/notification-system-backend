# Notification System Backend (notification-system-backend)
Welcome to Notification System Backend (notification-system-backend)

## Table of contents
* [Introduction](#introduction)
* [Requirements](#requirements)
* [Installation](#installation)
* [Configuration](#configuration)
* [Troubleshooting & FAQ](#troubleshooting-faq)

## Introduction
The service is based on Strapi JS framework.

## Requirements
- CPU cores >= 1
- RAM >= 256MB
- [Git 2.*](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker 20.*](https://docs.docker.com/engine/install/)

## Installation
- Set up git to have ssh access to the repository
- Clone the source into local machine
```shell
$ git clone git@github.com:dasmeta/notification-system-backend.git
```
- Go to the project source `$ cd notification-system-backend`
- Run docker-compose `$ docker-compose up -d` to start development environment.
- Run docker build to create a production ready image and install project dependencies.
```shell
$ docker build -t notification-system-backend:latest .
```

## Configuration
- Create an environment file `.env` and defined variables
```text
NODE_ENV=

# Web Server
HOST=0.0.0.0
PORT=2337
ADMIN_URL=
API_URL=

# Web Server Logging
STRAPI_LOG_LEVEL=trace
STRAPI_LOG_TIMESTAMP=true

# Database
DATABASE_HOST=
DATABASE_PORT=
DATABASE_NAME=notification-system-backend
DATABASE_USERNAME=
DATABASE_PASSWORD=

# Database Security
AUTHENTICATION_DATABASE=
DATABASE_SSL=

# JWT settings to validate token
ADMIN_JWT_SECRET=
JWT_SECRET=
JWT_ALGORITHM="HS256"

# Centralized Authentication
AUTHENTICATION_SERVICE_API_HOST=
AUTHENTICATION_IS_LIVE_MODE=

#################################
MAILGUN_API_KEY=
MAILGUN_DOMAIN_SETTINGS={}

SENTRY_DSN=
FORWARD_TO=false
IN_APP_MESSAGE_API_HEADERS={"X-API-KEY":"YOUR_API_KEY"}
BACKEND_URL=http://0.0.0.0:1337/api/external/send-mobile-notification
BASE_URL=http://0.0.0.0:2337


```
- Create and start a container ready to handle connections
```shell
$ docker run --name=ns-backend --env-file=.env -p "0.0.0.0:2337:2337" -v"$(pwd):/usr/src/app" notification-system-backend:latest
```
- The service will be accessible on http://0.0.0.0:2337

## Troubleshooting & FAQ
- View service logs
```shell
$ docker logs -f --since 2m ns-backend
```
- Run tests
```shell
$ docker exec em-backend bash -c "yarn test"
```
