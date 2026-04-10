import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          /* ant-design-vue v4 使用 css-in-js，无 es/xxx/style/css 路径 */
          importStyle: false,
          resolveIcons: false,
          exclude: ['ConfigProvider'],
        }),
      ],
      dts: 'src/components.d.ts',
    }),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
      template: 'treemap',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[/\\](html2canvas|jspdf)[/\\]/.test(id)) return 'export-vendor'
          if (id.includes('ant-design-vue')) return 'antd-vendor'
          if (id.includes('@amap')) return 'amap-loader'
          if (id.includes('vue-router') || id.includes('/vue/')) return 'vue-vendor'
        },
      },
    },
  },
})
