.PHONY: deploy
deploy: deploy-ui deploy-ws

ui/public/icon-512x512.png: ui/public/icon.svg
	rsvg-convert --height 512 --output ui/public/icon-512x512.png ui/public/icon.svg

ui/public/icon-256x256.png: ui/public/icon.svg
	rsvg-convert --height 256 --output ui/public/icon-256x256.png ui/public/icon.svg

ui/public/icon-192x192.png: ui/public/icon.svg
	rsvg-convert --height 192 --output ui/public/icon-192x192.png ui/public/icon.svg

.PHONY: build-ui
build-ui: ui/public/icon-512x512.png ui/public/icon-256x256.png ui/public/icon-192x192.png
	cd ui && bun ci && bun run build

.PHONY: deploy-ui
deploy-ui: build-ui
	cd ui && bun run build && bun run deploy

ws/bundle.js: ws/index.ts common/src/model.ts
	bun build ws/index.ts --outfile ws/bundle.js

.PHONY: deploy-ws
deploy-ws: ws/bundle.js
	rsync --archive ws/bundle.js horse:/data/ws.teeko.cc/
	ssh horse doas systemctl restart teeko-ws

.PHONY: ws
ws:
	bun run ws/index.ts

.PHONY: ui
ui:
	cd ui && bun ci && bun run build && bun start
