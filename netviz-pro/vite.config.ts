import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 9040, // Main application port
        strictPort: true,
        host: '0.0.0.0', // Allow external access
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
