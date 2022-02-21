.ONESHELL: # Only applies to all target

init:
	cp -n .env.dev .env
	yarn 
	yarn build
	yarn develop

up-dev:
	cp -n .env.dev .env
	yarn 
	yarn develop
