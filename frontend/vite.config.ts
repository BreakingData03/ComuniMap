import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Portas fora do padrão (5173/8000) para não colidir com outros projetos na máquina.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8010'

  return {
    // Caminhos relativos: o build funciona em qualquer subpasta (ex.: GitHub Pages).
    base: './',
    plugins: [react()],
    server: {
      port: 5273,
      proxy: {
        '/api': apiTarget,
        '/media': apiTarget,
      },
    },
  }
})
