import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig(({ command }) => ({
    plugins: [preact()],
    base: '/new/',
    build: {
        target: "esnext",
        polyfillDynamicImport: false,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: 'index.html',
                two: 'src/server.ts',
            }
        }
    },
}));
