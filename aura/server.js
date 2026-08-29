import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load local environment variables if present (for local testing of the production server)
const loadEnvLocal = () => {
  const envPath = path.join(__dirname, '.env.local');
  const env = {};
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
const supabaseUrl = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY || '';

const app = express();
const PORT = process.env.PORT || 5173;

app.use(express.json({ limit: '50mb' }));

// Set safe Cache-Control headers for all API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

// Server Health/Wakeup Ping
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'resonating' });
});

// Diagnostic Python Endpoint
app.get('/api/diagnose-python', (req, res) => {
  try {
    const diagScript = path.join(os.tmpdir(), `diag_${Date.now()}.py`);
    const code = `import sys
import os
import json

# Append Render-specific local packages to sys.path
_local_packages = "/opt/render/project/src/aura/.agents/skills/statement-parser/.python_packages"
if os.path.exists(_local_packages) and _local_packages not in sys.path:
    sys.path.insert(0, _local_packages)

pdfplumber_status = "Not installed"
try:
    import pdfplumber
    pdfplumber_status = f"Installed at {pdfplumber.__file__}"
except Exception as e:
    pdfplumber_status = f"ImportError: {str(e)}"

pymupdf_status = "Not installed"
try:
    import fitz
    pymupdf_status = f"Installed at {fitz.__file__}"
except Exception as e:
    pymupdf_status = f"ImportError: {str(e)}"

info = {
    "version": sys.version,
    "executable": sys.executable,
    "path": sys.path,
    "pdfplumber": pdfplumber_status,
    "pymupdf": pymupdf_status,
    "cwd": os.getcwd(),
    "env": {k: v for k, v in os.environ.items() if "KEY" not in k.upper() and "SECRET" not in k.upper() and "PASSWORD" not in k.upper() and "URL" not in k.upper()}
}
print(json.dumps(info))
`;
    fs.writeFileSync(diagScript, code);
    exec(`python3 "${diagScript}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(diagScript); } catch(e) {}
      if (error) {
        fs.writeFileSync(diagScript, code);
        exec(`python "${diagScript}"`, { timeout: 10000 }, (error2, stdout2, stderr2) => {
          try { fs.unlinkSync(diagScript); } catch(e) {}
          if (error2) {
            return res.status(500).json({ error: "Failed to run python3 and python", error1_msg: error.message, error2_msg: error2.message, stderr1: stderr, stderr2: stderr2 });
          }
          try {
            res.status(200).json(JSON.parse(stdout2.trim()));
          } catch(e) {
            res.status(500).json({ error: "JSON parse failed", stdout: stdout2, stderr: stderr2 });
          }
        });
        return;
      }
      try {
        res.status(200).json(JSON.parse(stdout.trim()));
      } catch(e) {
        res.status(500).json({ error: "JSON parse failed", stdout, stderr });
      }
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Bank Statement Parse PDF
app.post('/api/parse', (req, res) => {
  try {
    const { pdfBase64, bankType = 'kotak' } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdfBase64 payload' });
    }
    const buffer = Buffer.from(pdfBase64, 'base64');
    const tmpPath = path.join(os.tmpdir(), `${bankType}_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, buffer);

    // Explicit ping to keep Supabase active
    if (supabaseUrl && supabaseAnonKey) {
      const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
      supabaseServer.from('transactions').select('id', { count: 'exact', head: true }).limit(1).then(() => {
        console.log("[SERVER] Supabase pinged on PDF parse to maintain active status.");
      }).catch(err => console.error("[SERVER] Supabase ping failed:", err));
    }

    const parserPath = path.join(__dirname, '.agents', 'skills', 'statement-parser', 'parser.py');
    
    console.log(`[SERVER] Dispatching statement parse request: bankType=${bankType}`);
    exec(`python3 "${parserPath}" "${bankType}" "${tmpPath}"`, { timeout: 90000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tmpPath); } catch(e) {} // Clean up
      
      if (stderr) {
        console.warn("[PARSER STDERR LOG]:", stderr);
      }
      
      if (error) {
        console.error("[SERVER ERROR] Python parser failed:", stderr || error.message);
        return res.status(500).json({ error: stderr || stdout || error.message });
      }
      
      try {
        const parsed = JSON.parse(stdout.trim());
        res.status(200).json(parsed);
      } catch (jsonErr) {
        res.status(500).json({ error: 'Parser output is not valid JSON', raw: stdout });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 2b. Direct Real-Time Zero-Touch Payment Webhook (Samsung / Android Google Wallet / Apple Pay)

// 3. Plaid Link Token Creation
app.post('/api/plaid/create-link-token', async (req, res) => {
  try {
    const { clientId, secret, env = 'development', userId = 'aura_user_1' } = req.body;
    const effectiveClientId = clientId || process.env.PLAID_CLIENT_ID || '';
    const effectiveSecret = secret || process.env.PLAID_SECRET || '';
    const baseUrl = env === 'sandbox' ? 'https://sandbox.plaid.com' : 'https://development.plaid.com';

    if (!effectiveClientId || !effectiveSecret) {
      return res.status(400).json({ error: 'Missing Plaid Client ID or Secret' });
    }

    const payload = {
      client_id: effectiveClientId,
      secret: effectiveSecret,
      client_name: 'Aura Financial',
      country_codes: ['CA', 'US'],
      language: 'en',
      user: { client_user_id: userId },
      products: ['transactions', 'auth'],
    };

    const response = await fetch(`${baseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.error_code) {
      return res.status(400).json({ error: data.error_message || data.error_code });
    }

    res.status(200).json({ link_token: data.link_token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Plaid Public Token Exchange & Account Ingestion
app.post('/api/plaid/exchange-public-token', async (req, res) => {
  try {
    const { publicToken, clientId, secret, env = 'development', userId } = req.body;
    const effectiveClientId = clientId || process.env.PLAID_CLIENT_ID || '';
    const effectiveSecret = secret || process.env.PLAID_SECRET || '';
    const baseUrl = env === 'sandbox' ? 'https://sandbox.plaid.com' : 'https://development.plaid.com';

    // 1. Exchange public_token for access_token
    const exchangeRes = await fetch(`${baseUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: effectiveClientId,
        secret: effectiveSecret,
        public_token: publicToken,
      }),
    });
    const exchangeData = await exchangeRes.json();
    if (exchangeData.error_code) {
      return res.status(400).json({ error: exchangeData.error_message });
    }

    const accessToken = exchangeData.access_token;
    const itemId = exchangeData.item_id;

    // 2. Fetch Accounts
    const accRes = await fetch(`${baseUrl}/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: effectiveClientId,
        secret: effectiveSecret,
        access_token: accessToken,
      }),
    });
    const accData = await accRes.json();
    const accounts = accData.accounts || [];
    const institution = accData.item?.institution_id || 'Canadian Bank';

    // 3. Save to Supabase bank_accounts if credentials available
    if (supabaseUrl && supabaseAnonKey && userId && accounts.length > 0) {
      const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
      for (const a of accounts) {
        const accType = a.type === 'credit' ? 'Credit Card' : a.subtype === 'savings' ? 'Savings Account' : 'Checking Account';
        await supabaseServer.from('bank_accounts').upsert({
          id: 'acc_plaid_' + a.account_id,
          user_id: userId,
          bank_id: institution.toLowerCase().includes('scotia') ? 'scotiabank' : institution.toLowerCase().includes('rbc') ? 'rbc' : institution.toLowerCase().includes('td') ? 'td' : 'other',
          account_name: a.name || 'Plaid Bank Account',
          account_type: accType,
          balance: a.balances?.current || a.balances?.available || 0,
          currency: a.balances?.iso_currency_code || 'CAD',
          last_4_digits: a.mask || '0000',
          credit_limit: a.balances?.limit || null,
          notes: `Connected via Plaid Open Banking (Item ${itemId})`,
        }, { onConflict: 'id' });
      }
    }

    res.status(200).json({ status: 'connected', accounts, itemId, accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhook/transaction', async (req, res) => {
  try {
    let { 
      amount, 
      merchant, 
      description,
      category, 
      currency = 'CAD', 
      card = 'Google Wallet (Samsung Pay / NFC)',
      payment_method,
      date = new Date().toISOString().split('T')[0],
      user_id,
      // Raw notification fields from MacroDroid / Android
      message,
      title,
      text,
      notification
    } = req.body;

    let parsedAmount = Math.abs(parseFloat(amount) || 0);
    let txDesc = description || merchant || '';

    // Handle raw Android / Google Wallet notification text (e.g. "Paid $4.25 to Tim Hortons")
    const rawText = message || text || notification || req.body.body || (typeof req.body === 'string' ? req.body : '');
    if (rawText && parsedAmount === 0) {
      // 1. Extract Amount: "$4.25", "CAD 4.25", "4.25 CAD"
      const amtMatch = rawText.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/i) ||
                       rawText.match(/(?:CAD|USD|INR)\s*([0-9]+(?:\.[0-9]{2})?)/i) ||
                       rawText.match(/([0-9]+(?:\.[0-9]{2})?)\s*(?:CAD|dollars)/i);
      if (amtMatch) {
        parsedAmount = parseFloat(amtMatch[1]);
      }

      // 2. Extract Merchant: "to Tim Hortons", "at Costco Wholesale", "spent at Shoppers"
      const mMatch = rawText.match(/(?:to|at|from|spent at|paid to)\s+([A-Za-z0-9\s&'.-]{2,35})(?:\s+with|\s+on|\.|\n|$)/i);
      if (mMatch) {
        txDesc = mMatch[1].trim();
      } else {
        txDesc = rawText.slice(0, 40);
      }
    }

    if (parsedAmount === 0) {
      return res.status(400).json({ error: 'Could not detect valid amount from payload' });
    }

    if (!txDesc) {
      txDesc = 'Google Wallet Payment';
    }
    
    // Auto-categorize intelligently
    let autoCategory = category;
    if (!autoCategory) {
      const lower = (txDesc + ' ' + (rawText || '')).toLowerCase();
      if (/tim hortons|tims|starbucks|mcdonald|restaurant|subway|chipotle|cafe|coffee|dining|food|pizza|burger|sushi/i.test(lower)) {
        autoCategory = 'Food';
      } else if (/costco|loblaws|metro|walmart|sobeys|no frills|grocery|superstore|freshco|farm boy|food basics/i.test(lower)) {
        autoCategory = 'Groceries';
      } else if (/ttc|presto|uber|lyft|gas|esso|petro|shell|transit|flight|train|via rail/i.test(lower)) {
        autoCategory = 'Transport';
      } else if (/amazon|shoppers|winners|best buy|apple|mall|clothing|h&m|zara|uniqlo|dollarama/i.test(lower)) {
        autoCategory = 'Shopping';
      } else if (/netflix|spotify|cinema|cineplex|lcbo|pub|bar|beer/i.test(lower)) {
        autoCategory = 'Entertainment';
      } else {
        autoCategory = 'Miscellaneous';
      }
    }

    const payload = {
      description: txDesc,
      amount: parsedAmount,
      category: autoCategory,
      currency: currency.toUpperCase(),
      payment_method: payment_method || card || (title ? `Google Wallet (${title})` : 'Google Wallet'),
      date: date,
      user_id: user_id || req.query.user_id || null,
      created_at: new Date().toISOString()
    };

    console.log('[REAL-TIME ZERO-TOUCH WEBHOOK] Automatically ingested payment from Samsung / Google Wallet:', payload);

    // Save directly to Supabase
    if (supabaseUrl && supabaseAnonKey) {
      const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
      const { error: dbError } = await supabaseServer.from('transactions').insert(payload);
      if (dbError) {
        console.error('[SERVER] Supabase transaction insert failed:', dbError);
      } else {
        console.log('[SERVER] Transaction logged automatically to Supabase.');
      }
    }

    // Fallback local queue
    const queuePath = path.join(os.tmpdir(), 'aura_realtime_transactions.json');
    let queue = [];
    if (fs.existsSync(queuePath)) {
      try { queue = JSON.parse(fs.readFileSync(queuePath, 'utf8') || '[]'); } catch (e) { queue = []; }
    }
    queue.unshift(payload);
    fs.writeFileSync(queuePath, JSON.stringify(queue.slice(0, 100), null, 2), 'utf8');

    res.status(200).json({ 
      status: 'success', 
      message: 'Transaction ingested in 0-seconds from Google Wallet', 
      transaction: payload 
    });
  } catch (err) {
    console.error('[ZERO-TOUCH WEBHOOK ERROR]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Incoming SMS Webhook
app.post('/api/webhook/sms', (req, res) => {
  try {
    const { sender, message } = req.body;
    if (!sender || !message) {
      return res.status(400).json({ error: 'Missing sender or message' });
    }

    console.log(`[SERVER WEBHOOK] Received payload: sender="${sender}", message="${message}"`);

    // Explicit ping to keep Supabase active
    if (supabaseUrl && supabaseAnonKey) {
      const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
      supabaseServer.from('pending_sms').select('id', { count: 'exact', head: true }).limit(1).then(() => {
        console.log("[SERVER] Supabase pinged on SMS webhook to maintain active status.");
      }).catch(err => console.error("[SERVER] Supabase ping failed:", err));
    }

    const smsParserPath = path.join(__dirname, '.agents', 'skills', 'statement-parser', 'sms_parser.py');
    
    // Clean inputs for shell safety
    const safeSender = sender.replace(/"/g, '\\"');
    const safeMessage = message.replace(/"/g, '\\"');
    
    exec(`python3 "${smsParserPath}" "${safeSender}" "${safeMessage}"`, { timeout: 30000 }, async (error, stdout, stderr) => {
      if (stderr) {
        console.error("[SERVER WEBHOOK PYTHON STDERR]:", stderr);
      }
      
      if (error) {
        console.warn(`[SERVER PARSER ERROR] Failed to match regex for string: "${message}"`);
        return res.status(500).json({ error: stderr || stdout || error.message });
      }
      
      try {
        const parsedTx = JSON.parse(stdout.trim());
        if (parsedTx.error) {
          console.warn(`[SERVER PARSER ERROR] Internal parsing error: "${parsedTx.error}"`);
          return res.status(500).json({ error: parsedTx.error });
        }
        
        // Extract user_id from query parameters if present, e.g. /api/webhook/sms?user_id=...
        const userIdParam = req.query.user_id || null;

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
            console.error("[SERVER] Supabase pending_sms queue insert failed:", dbError);
          } else {
            console.log("[SERVER] Successfully synced webhook transaction to Supabase table.");
          }
        } else {
          console.warn("[SERVER] Supabase env variables missing. Skipping database insert.");
        }

        // Still write locally to system tmp directory as fallback / Sandbox backup
        const queuePath = path.join(os.tmpdir(), 'aura_pending_sms_queue.json');
        let queue = [];
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
        
        res.status(200).json({ status: 'success' });
      } catch (parseErr) {
        res.status(500).json({ error: 'Failed to parse script output: ' + parseErr.message, raw: stdout });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET Pending SMS Fallback Queue
app.get('/api/pending-sms', (req, res) => {
  try {
    const queuePath = path.join(os.tmpdir(), 'aura_pending_sms_queue.json');
    let queue = [];
    if (fs.existsSync(queuePath)) {
      try {
        const content = fs.readFileSync(queuePath, 'utf8');
        queue = JSON.parse(content || '[]');
      } catch (e) {
        queue = [];
      }
    }
    res.status(200).json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE Pending SMS Fallback Queue
app.delete('/api/pending-sms', (req, res) => {
  try {
    const queuePath = path.join(os.tmpdir(), 'aura_pending_sms_queue.json');
    if (fs.existsSync(queuePath)) {
      fs.writeFileSync(queuePath, '[]', 'utf8');
    }
    res.status(200).json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static PWA built assets
const buildPath = path.join(__dirname, 'dist');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  console.log(`[SERVER] Static assets path established: serving PWA production builds.`);
} else {
  console.warn(`[SERVER WARNING] dist/ folder not found. Be sure to run 'npm run build' before launching the server.`);
}

app.listen(PORT, () => {
  console.log(`[SERVER] Aura Node active on port ${PORT}. Status: RESONATING.`);
});
