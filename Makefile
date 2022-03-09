.PHONY: deploy
deploy: deploy-ui deploy-ws

ui/public/icon-512x512.png: ui/public/icon.svg
	rsvg-convert --height 512 --output ui/public/icon-512x512.png ui/public/icon.svg

ui/public/icon-192x192.png: ui/public/icon.svg
	rsvg-convert --height 192 --output ui/public/icon-192x192.png ui/public/icon.svg

.PHONY: build-ui
build-ui: ui/public/icon-192x192.png ui/public/icon-512x512.png
	cd ui && npm ci && npm run build

.PHONY: deploy-ui
deploy-ui: build-ui
	rsync --archive --delay-updates ui/dist/ horse:/data/teeko.cc/
	curl -sfX POST "https://api.cloudflare.com/client/v4/zones/664e4bfb647853cad92f1bf7d0a20b35/purge_cache" \
		-H "Authorization: Bearer $$(< ~/.cfpurgetoken)" \
		-H "Content-Type: application/json" \
		--data '{"purge_everything":true}'

.PHONY: deploy-ws
deploy-ws:
	rsync --archive ws/ horse:/data/ws.teeko.cc/
	ssh horse doas systemctl restart teeko-ws
