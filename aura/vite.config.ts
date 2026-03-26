import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pythonParserPlugin = () => ({
  name: 'python-parser',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/parse' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString() });
        req.on('end', () => {
          try {
            const { pdfBase64, bankType = 'kotak' } = JSON.parse(body);
            const buffer = Buffer.from(pdfBase64, 'base64');
            const tmpPath = path.join(os.tmpdir(), `${bankType}_${Date.now()}.pdf`);
            fs.writeFileSync(tmpPath, buffer);

            const parserPath = path.join(__dirname, '.agents', 'skills', 'statement-parser', 'parser.py');
            
            // Execute: python parser.py <bankType> <tmpPath>
            exec(`python "${parserPath}" "${bankType}" "${tmpPath}"`, { timeout: 15000 }, (error, stdout, stderr) => {
              try { fs.unlinkSync(tmpPath); } catch(e) {} // Clean up
              
              if (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: stderr || stdout || error.message }));
                return;
              }
              
              res.setHeader('Content-Type', 'application/json');
              res.end(stdout);
            });
            
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    pythonParserPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Aura',
        short_name: 'Aura',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
