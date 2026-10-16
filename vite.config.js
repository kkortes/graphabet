import { defineConfig } from 'vite';
import vibe from '@ape-egg/vite-plugin-vibe';

// Dev serves the pages tree straight from source; `vibe compile` turns the same tree into the SPA shell
export default defineConfig({
  server: { allowedHosts: ['.localhost'] },
  optimizeDeps: { exclude: ['@ape-egg/vibe'] },
  plugins: [
    vibe(),
    {
      name: 'rewrite-routes',
      configureServer(server) {
        server.middlewares.use((req, res, next) => (req.url.split('?')[0] === '/' && (req.url = '/pages/index.html'), next()));
      },
    },
  ],
});
