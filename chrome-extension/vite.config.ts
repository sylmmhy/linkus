import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

export default defineConfig(({ mode }) => {
  // 加载环境变量，确保从 chrome-extension 目录加载
  const env = loadEnv(mode, __dirname, '')

  return {
    plugins: [
      react(),
      crx({ manifest })
    ],
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    // 定义全局常量，确保环境变量在所有地方都可用（包括 service worker）
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      // 同时定义 process.env 用于兼容性
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    build: {
      rollupOptions: {
        input: {
          popup: 'src/sidebar/index.html'
        }
      }
    }
  }
})