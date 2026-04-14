import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
    define: {
      'process.env.REACT_APP_GEMINI_KEY_1': JSON.stringify(env.REACT_APP_GEMINI_KEY_1),
      'process.env.REACT_APP_GEMINI_KEY_2': JSON.stringify(env.REACT_APP_GEMINI_KEY_2),
      'process.env.REACT_APP_GEMINI_KEY_3': JSON.stringify(env.REACT_APP_GEMINI_KEY_3),
      'process.env.REACT_APP_GEMINI_KEY_4': JSON.stringify(env.REACT_APP_GEMINI_KEY_4),
      'process.env.REACT_APP_OPENAI_KEY_1': JSON.stringify(env.REACT_APP_OPENAI_KEY_1),
      'process.env.REACT_APP_OPENAI_KEY_2': JSON.stringify(env.REACT_APP_OPENAI_KEY_2),
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(env.REACT_APP_API_BASE_URL || env.VITE_API_BASE_URL || 'http://localhost:8000'),
    }
  }
})
