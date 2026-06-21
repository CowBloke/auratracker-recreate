import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss()],
    // The shared contracts package ships raw TS; let Vite compile it as source
    // instead of trying to pre-bundle it as an external dependency.
    optimizeDeps: { exclude: ['@aura/contracts'] },
    server: {
      port: 5173,
      proxy: {
        // Proxy API + sockets in dev so cookies are first-party (same origin).
        '/api': { target: apiUrl, changeOrigin: true },
        '/socket.io': { target: apiUrl, ws: true, changeOrigin: true },
      },
    },
  };
});
