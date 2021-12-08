.PHONY: deploy
deploy: deploy-ui

ui/public/icon-512x512.png: ui/public/icon.svg
	rsvg-convert --height 512 --output ui/public/icon-512x512.png ui/public/icon.svg

ui/public/icon-192x192.png: ui/public/icon.svg
	rsvg-convert --height 192 --output ui/public/icon-192x192.png ui/public/icon.svg

.PHONY: build-ui
build-ui: ui/public/icon-192x192.png ui/public/icon-512x512.png
	cd ui && npm ci && npm run build

.PHONY: deploy-ui
deploy-ui: build-ui
	rsync --archive --delay-updates ui/dist/ ident.me:/data/teeko.cc/

.PHONY: ws
ws:
	deno run --allow-net deno/ws.ts
