import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Exposes the list of files that really exist in public/assets as
 * `virtual:asset-manifest`, so the app only requests photographs that are
 * there and shows a designed placeholder otherwise (no 404s in the console).
 */
function assetManifest(): Plugin {
  const id = 'virtual:asset-manifest';
  const resolved = '\0' + id;
  const dir = path.resolve(process.cwd(), 'public/assets');
  const list = () =>
    fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.startsWith('.')) : [];
  return {
    name: 'asset-manifest',
    resolveId(source) {
      if (source === id) return resolved;
    },
    load(source) {
      if (source === resolved) return `export default ${JSON.stringify(list())};`;
    },
    configureServer(server) {
      const refresh = (file: string) => {
        if (!path.resolve(file).startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.add(dir);
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), assetManifest()],
  build: {
    assetsDir: 'static',
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three') || id.includes('three-stdlib')) return 'r3f';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        },
      },
    },
  },
  server: { port: 5173, strictPort: false },
});
