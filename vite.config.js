import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(() => {
  const config = {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: '商品検索アプリ',
          short_name: '商品検索',
          description: 'Excelデータから商品を検索・注文できるアプリ',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    base: '/',
  }

  // Base path is root for Vercel
  config.base = '/'

  config.server = {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
    configureServer(server) {
      server.middlewares.use('/_local_images', (req, res, next) => {
        // コメント: ユーザーが指定したネットワーク共有フォルダパス
        const targetDir = '\\\\ASAHIPACK01\\asahipac01_F\\画像';
        
        const url = new URL(req.url, 'http://localhost');
        const decodedPath = decodeURIComponent(url.pathname);
        const filename = decodedPath.replace(/^\//, '');
        
        if (!filename) {
          next();
          return;
        }

        const fileCandidates = [];
        const hasExtension = /\.(jpg|jpeg|png)$/i.test(filename);

        if (hasExtension) {
          fileCandidates.push(filename);
          const base = filename.replace(/\.(jpg|jpeg|png)$/i, '');
          const ext = filename.match(/\.(jpg|jpeg|png)$/i)[0];
          fileCandidates.push(`${base}A${ext}`);
        } else {
          const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
          for (const ext of extensions) {
            fileCandidates.push(`${filename}${ext}`);
            fileCandidates.push(`${filename}A${ext}`);
          }
        }

        let foundPath = null;
        for (const candidate of fileCandidates) {
          const resolvedPath = path.resolve(targetDir, candidate);
          // コメント: パストラバーサル防止のため、解決したパスが指定フォルダ配下であることを検証
          if (resolvedPath.startsWith(path.resolve(targetDir))) {
            if (fs.existsSync(resolvedPath)) {
              foundPath = resolvedPath;
              break;
            }
          }
        }

        if (foundPath) {
          const ext = path.extname(foundPath).toLowerCase();
          let contentType = 'application/octet-stream';
          if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          else if (ext === '.png') contentType = 'image/png';

          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'max-age=3600');
          fs.createReadStream(foundPath).pipe(res);
          return;
        }

        next();
      });
    }
  }

  return config
})
