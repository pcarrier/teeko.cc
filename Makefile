.PHONY: build-ui
build-ui:
	cd ui && npm ci && npm run build

.PHONY: deploy-ui
deploy-ui: build-ui
	rsync --archive --delay-updates ui/dist/ ident.me:/data/teeko.cc/new/

.PHONY: deploy
deploy: deploy-ui
