import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');

  const plugins = [react(), tailwindcss()];

  const isDev = !!env.VITE_APP_PASSWORD_HASH;

  if (isDev) {
    plugins.push(basicSsl());
  }

  return {
    plugins,
    server: {
      https: isDev,
      port: Number(env.VITE_KHAOS_FRONTEND_PORT) || 5173,
    },
  };
});
