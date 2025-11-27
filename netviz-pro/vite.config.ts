import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 9042, // Internal port - Gateway server handles public access on 9040
        strictPort: true,
        host: '127.0.0.1', // Localhost only - not directly accessible externally
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.FOR_SEARCH_API_FUTURE),
        'process.env.FOR_SEARCH_API_FUTURE': JSON.stringify(env.FOR_SEARCH_API_FUTURE)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
