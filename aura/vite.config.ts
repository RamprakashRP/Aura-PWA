import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createClient } from '@supabase/supabase-js'

const loadEnvLocal = () => {
  const envPath = path.join(__dirname, '.env.local');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val.trim();
      }
    });
  }
  return env;
};

const localEnv = loadEnvLocal();
const supabaseUrl = localEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = localEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const pythonParserPlugin = () => ({
  name: 'python-parser',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = req.url || '';
      
      if (url === '/api/parse' && req.method === 'POST') {
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
      } else if (url.startsWith('/api/webhook/sms') && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString() });
        req.on('end', () => {
          try {
            const { sender, message } = JSON.parse(body);
            if (!sender || !message) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing sender or message' }));
              return;
            }

            console.log(`[WEBHOOK] Received payload: sender="${sender}", message="${message}"`);

            const smsParserPath = path.join(__dirname, '.agents', 'skills', 'statement-parser', 'sms_parser.py');
            
            // Clean inputs for shell safety
            const safeSender = sender.replace(/"/g, '\\"');
            const safeMessage = message.replace(/"/g, '\\"');
            
            exec(`python "${smsParserPath}" "${safeSender}" "${safeMessage}"`, { timeout: 15000 }, async (error, stdout, stderr) => {
              if (stderr) {
                console.error(stderr);
              }
              
              if (error) {
                console.warn(`[PARSER ERROR] Failed to match regex for string: "${message}"`);
                res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: stderr || stdout || error.message }));
                return;
              }
              
              try {
                const parsedTx = JSON.parse(stdout.trim());
                if (parsedTx.error) {
                  console.warn(`[PARSER ERROR] Failed to match regex for string: "${message}"`);
                  res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: parsedTx.error }));
                  return;
                }
                
                // Extract user_id from query parameters if present, e.g. /api/webhook/sms?user_id=...
                const reqUrl = new URL(url, `http://${req.headers.host || 'localhost'}`);
                const userIdParam = reqUrl.searchParams.get('user_id') || null; // Fallback to null (globally visible Sandbox flag)

                // Build insert payload for pending_sms Supabase table
                const payload = {
                  transaction_id: parsedTx.transaction_id,
                  date: parsedTx.date,
                  description: parsedTx.description,
                  category: parsedTx.category,
                  amount: parsedTx.amount,
                  currency: parsedTx.currency,
                  visibility: parsedTx.visibility || 'Private',
                  bank: parsedTx.bank || 'Unknown',
                  user_id: userIdParam
                };

                // Connect to Supabase and insert row
                if (supabaseUrl && supabaseAnonKey) {
                  const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
                  const { error: dbError } = await supabaseServer
                    .from('pending_sms')
                    .insert(payload);

                  if (dbError) {
                    console.error("Supabase pending_sms queue insert failed:", dbError);
                  }
                } else {
                  console.warn("Vite middleware: Supabase env vars not found. Skipping DB insert.");
                }

                // Still write locally to system tmp directory as fallback / Sandbox backup
                const queuePath = path.join(os.tmpdir(), 'aura_pending_sms_queue.json');
                let queue: any[] = [];
                if (fs.existsSync(queuePath)) {
                  try {
                    const content = fs.readFileSync(queuePath, 'utf8');
                    queue = JSON.parse(content || '[]');
                  } catch (e) {
                    queue = [];
                  }
                }
                queue.push(parsedTx);
                fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
                
                res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'success' }));
              } catch (parseErr: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Failed to parse script output: ' + parseErr.message, raw: stdout }));
              }
            });
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else if (url.startsWith('/api/pending-sms') && req.method === 'GET') {
        try {
          const queuePath = path.join(os.tmpdir(), 'aura_pending_sms_queue.json');
          let queue: any[] = [];
          if (fs.existsSync(queuePath)) {
            try {
              const content = fs.readFileSync(queuePath, 'utf8');
              queue = JSON.parse(content || '[]');
            } catch (e) {
              queue = [];
            }
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.end(JSON.stringify(queue));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      } else if (url.startsWith('/api/pending-sms') && req.method === 'DELETE') {
        try {
          const queuePath = path.join(os.tmpdir(), 'aura_pending_sms_queue.json');
          if (fs.existsSync(queuePath)) {
            fs.writeFileSync(queuePath, '[]', 'utf8');
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.end(JSON.stringify({ status: 'success' }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      } else {
        next();
      }
    });
  }
});


// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  },
  css: {
    devSourcemap: false
  },
  build: {
    sourcemap: false
  },
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
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
