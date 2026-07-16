import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');

  const plugins = [react(), tailwindcss()];

  const useHttps = env.VITE_USE_HTTPS !== 'false';

  if (useHttps) {
    plugins.push(mkcert());
  }

  return {
    plugins,
    server: {
      https: useHttps,
      port: Number(env.VITE_KHAOS_FRONTEND_PORT) || 5173,
    },
    // TEMPORARY — diagnosing a production-only blank-screen crash. Sourcemaps
    // let the browser console resolve the minified stack trace back to real
    // file/line. Remove once the crash is identified and fixed.
    build: {
      sourcemap: true,
    },
  };
});
