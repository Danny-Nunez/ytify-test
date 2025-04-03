import { defineConfig, PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solidPlugin from 'vite-plugin-solid';
import autoprefixer from 'autoprefixer';
/*
import postcssJitProps from 'postcss-jit-props';
import OpenProps from 'open-props';
*/
import { resolve } from 'path';
import { readdirSync } from 'fs';



export default defineConfig(({ command }) => ({
  define: {
    Locales: readdirSync(resolve(__dirname, './src/locales')).map(file => file.slice(0, 2)),
    Version: JSON.stringify(
      ((today = new Date()) => `${process.env.npm_package_version} (${today.getDate()} ${today.toLocaleString('default', { month: 'short' })} ${today.getFullYear()})`)()
    ),
  },
  plugins: [
    injectEruda(command === 'serve'),
    solidPlugin(),
    VitePWA({
      manifest: {
        "short_name": "Ytify",
        "name": "Listen with ytify",
        "description": "32kb/s to 128kb/s youtube audio streaming website. Copy a youtube video link and listen to it as an audio totally free.",
        "icons": [
          {
            "src": "logo192.png",
            "type": "image/png",
            "sizes": "192x192",
            "purpose": "any maskable"
          },
          {
            "src": "logo512.png",
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "any maskable"
          },
          {
            "src": "logo512.png",
            "type": "image/png",
            "sizes": "44x44",
            "purpose": "any"
          }
        ],
        "shortcuts": [
          {
            "name": "History",
            "url": "/list?collection=history",
            "icons": [
              {
                "src": "memories-fill.png",
                "sizes": "192x192",
              }]
          },
          {
            "name": "Favorites",
            "url": "/list?collection=favorites",
            "icons": [
              {
                "src": "heart-fill.png",
                "sizes": "192x192",
              }]
          },
          {
            "name": "Listen Later",
            "url": "/list?collection=listenLater",
            "icons": [
              {
                "src": "calendar-schedule-fill.png",
                "sizes": "192x192",
              }]
          }
        ],
        "start_url": "/",
        "display": "standalone",
        "theme_color": "white",
        "background_color": "white",
        "share_target": {
          "action": "/",
          "method": "GET",
          "params": {
            "title": "title",
            "text": "text",
            "url": "url"
          }
        }
      },
      disable: command !== 'build',
      includeAssets: ['*.woff2', 'ytify_banner.webp']
    })
  ],
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
        //  postcssJitProps(OpenProps)
      ]
    }
  },
  server: {
    proxy: {
      '/invidious': {
        target: 'https://inv.stealthy.club',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/invidious/, '/api/v1')
      },
      '/piped': {
        target: 'https://pipedapi.kavin.rocks',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/piped/, '')
      },
      '/audio': {
        target: 'https://inv.stealthy.club',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/audio/, '')
      },
      '/ytify': {
        target: 'https://ytify.netlify.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ytify/, '')
      }
    }
  }
}));


const injectEruda = (serve: boolean) => serve ? (<PluginOption>{
  name: 'erudaInjector',
  transformIndexHtml: html => ({
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          src: '/node_modules/eruda/eruda'
        },
        injectTo: 'body-prepend'
      },
      {
        tag: 'script',
        injectTo: 'body-prepend',
        children: 'eruda.init()'
      }
    ]
  })
}) : [];



