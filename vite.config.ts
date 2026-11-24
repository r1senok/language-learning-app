import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { isPublishableKey } from './src/services/supabase'

export default defineConfig(({ mode }) => {
  const { VITE_SUPABASE_PUBLISHABLE_KEY: key } = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_')
  if (key?.trim() && !isPublishableKey(key)) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must contain a Supabase publishable key (sb_publishable_...).')
  }

  return {
    plugins: [react(), tailwindcss()],
    ...(process.env.CF_PAGES_BRANCH === 'feat/takku-interactive-lessons' && {
      build: {
        rollupOptions: {
          input: {
            app: fileURLToPath(new URL('./index.html', import.meta.url)),
            speechTest: fileURLToPath(new URL('./speech-test.html', import.meta.url)),
          },
        },
      },
    }),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
