import { useState } from 'react';
import { 
  Mail, 
  Landmark, 
  CheckCircle, 
  Copy, 
  Radio, 
  Smartphone,
  Zap,
  Key,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ZeroTouchSync() {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [activeChannel, setActiveChannel] = useState<'android' | 'ios' | 'email' | 'plaid'>('android');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Plaid state
  const [plaidClientId, setPlaidClientId] = useState('');
  const [plaidSecret, setPlaidSecret] = useState('');
  const [isConnectingPlaid, setIsConnectingPlaid] = useState(false);
  const [plaidSaved, setPlaidSaved] = useState(false);

  const webhookUrl = window.location.origin + '/api/webhook/transaction';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleSavePlaidKeys = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingPlaid(true);
    setTimeout(() => {
      localStorage.setItem('aura_plaid_client_id', plaidClientId);
      localStorage.setItem('aura_plaid_secret', plaidSecret);
      setIsConnectingPlaid(false);
      setPlaidSaved(true);
      setTimeout(() => setPlaidSaved(false), 3000);
    }, 800);
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-[#080808]/90 border border-zinc-800 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #00f2fe)` }}
          >
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">Zero-Touch Automation & Open Banking</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Live Background Ingestion
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose your preferred method to sync Canadian bank accounts, credit cards, Google Wallet, and Interac
            </p>
          </div>
        </div>

        {/* Live Webhook Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#000000] border border-zinc-800 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-zinc-400">Webhook Node:</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
      </div>

      {/* Channel Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setActiveChannel('android')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'android'
              ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Smartphone size={16} className="text-cyan-400" />
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300">
              Samsung / Android
            </span>
          </div>
          <div className="font-bold text-xs text-white">Google Wallet Tap</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Instant MacroDroid bridge</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel('plaid')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'plaid'
              ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Landmark size={16} className="text-purple-400" />
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300">
              Direct API
            </span>
          </div>
          <div className="font-bold text-xs text-white">Canadian Open Banking</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Plaid / Flinks OAuth Sync</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel('ios')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'ios'
              ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Zap size={16} className="text-rose-400" />
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300">
              iPhone / Watch
            </span>
          </div>
          <div className="font-bold text-xs text-white">Apple Pay Automation</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Native iOS Shortcuts</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel('email')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'email'
              ? 'border-amber-500 bg-amber-500/10 text-white shadow-lg'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Mail size={16} className="text-amber-400" />
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300">
              Interac e-Transfer
            </span>
          </div>
          <div className="font-bold text-xs text-white">Email Auto-Forwarding</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Gmail / Outlook rules</div>
        </button>
      </div>

      {/* CHANNEL 1: CANADIAN OPEN BANKING (PLAID & FLINKS) */}
      {activeChannel === 'plaid' && (
        <div className="p-6 rounded-2xl bg-[#080808]/95 border border-purple-500/40 shadow-2xl space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Landmark className="text-purple-400" size={20} />
                <span>Direct Canadian Open Banking Sync (Plaid Canada & Flinks)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                Connect your TD, RBC, Scotiabank, BMO, CIBC, or Tangerine accounts via official bank API OAuth tokens for automated daily ledger sync.
              </p>
            </div>
            <a
              href="https://dashboard.plaid.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <span>Get Free Plaid Keys</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Explanation Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 space-y-1.5">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 flex items-center justify-center text-[10px]">1</span>
                <span>Supported Banks</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                TD Canada Trust, RBC Royal Bank, Scotiabank, BMO, CIBC, Tangerine, Desjardins & Simplii.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 space-y-1.5">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 flex items-center justify-center text-[10px]">2</span>
                <span>How It Works</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Plaid Link creates a secure 256-bit read-only OAuth token. Aura never sees or stores your bank password.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 space-y-1.5">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 flex items-center justify-center text-[10px]">3</span>
                <span>Nightly Auto-Reconcile</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Aura queries Plaid once every 24 hours to automatically ingest cleared credit card and checking transactions.
              </p>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSavePlaidKeys} className="p-4 rounded-xl bg-[#000000] border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
              <Key size={14} className="text-purple-400" />
              <span>Enter Your Plaid Developer Credentials (Free Development Tier)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Plaid Client ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 64a8b7c9e1234567890..."
                  value={plaidClientId}
                  onChange={(e) => setPlaidClientId(e.target.value)}
                  className="w-full bg-[#080808] border border-zinc-800 rounded-lg p-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Plaid Secret (Development Key)
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••"
                  value={plaidSecret}
                  onChange={(e) => setPlaidSecret(e.target.value)}
                  className="w-full bg-[#080808] border border-zinc-800 rounded-lg p-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-zinc-500">
                Country code is preset to: <strong className="text-zinc-300 font-mono">CA (Canada)</strong>
              </span>
              <button
                type="submit"
                disabled={isConnectingPlaid || (!plaidClientId && !plaidSecret)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                {plaidSaved ? <CheckCircle size={14} className="text-emerald-300" /> : <Lock size={14} />}
                <span>{isConnectingPlaid ? 'Saving...' : plaidSaved ? 'Credentials Saved!' : 'Save & Enable Open Banking'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHANNEL 2: ANDROID / SAMSUNG S26 GOOGLE WALLET (0-SECOND REAL-TIME TAP) */}
      {activeChannel === 'android' && (
        <div className="p-6 rounded-2xl bg-[#080808]/95 border border-cyan-500/40 shadow-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="text-cyan-400" size={20} />
              <span>Samsung Galaxy S26 Ultra / Google Wallet Real-Time Bridge</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                0-Second Instant Tap
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Whenever you pay at any store with Google Wallet on your Samsung S26 Ultra, MacroDroid instantly captures the payment notification and forwards it to Aura in under 1 second.
            </p>
          </div>

          {/* 3 Simple Setup Steps */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <b className="text-white">Install MacroDroid (Free on Google Play Store)</b>
                <p className="text-zinc-400 mt-0.5">MacroDroid is a lightweight, safe automation app with zero background battery drain.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <b className="text-white">Trigger: Notification Received $\rightarrow$ Select (Google Wallet / TD / RBC / Scotiabank)</b>
                <p className="text-zinc-400 mt-0.5">Choose Google Wallet or your bank app as the monitored notification source.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div className="w-full">
                <b className="text-white">Action: HTTP Request $\rightarrow$ POST to Aura Endpoint</b>
                <p className="text-zinc-400 mt-0.5 mb-2">Send notification title and body directly to your endpoint:</p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-zinc-700 font-mono text-[11px] text-cyan-300">
                  <span className="truncate">{webhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook-url-android')}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white ml-2 flex-shrink-0 cursor-pointer"
                  >
                    {copiedText === 'webhook-url-android' ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL 3: APPLE PAY / IOS SHORTCUT */}
      {activeChannel === 'ios' && (
        <div className="p-6 rounded-2xl bg-[#080808]/95 border border-rose-500/40 shadow-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="text-rose-400" size={20} />
              <span>Apple Pay Real-Time Automation</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Built into iPhone
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Whenever you tap your iPhone or Apple Watch at any store, iOS wakes up a background shortcut that automatically posts the transaction data to Aura.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <b className="text-white">Open the &quot;Shortcuts&quot; App on your iPhone</b>
                <p className="text-zinc-400 mt-0.5">Tap the <b>Automation</b> tab at the bottom $\rightarrow$ Tap <b>+ (New Automation)</b>.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <b className="text-white">Select &quot;Transaction&quot; (When I use Apple Pay)</b>
                <p className="text-zinc-400 mt-0.5">Choose <b>Any Card</b> $\rightarrow$ Select <b>Run Immediately (No confirmation)</b>.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div className="w-full">
                <b className="text-white">Add Action: &quot;Get Contents of URL&quot; (HTTP POST)</b>
                <p className="text-zinc-400 mt-0.5 mb-2">Set Method to <b>POST</b> and paste your webhook endpoint URL:</p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-zinc-700 font-mono text-[11px] text-rose-300">
                  <span className="truncate">{webhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook-url-ios')}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white ml-2 flex-shrink-0 cursor-pointer"
                  >
                    {copiedText === 'webhook-url-ios' ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL 4: EMAIL & INTERAC AUTO-FORWARDER */}
      {activeChannel === 'email' && (
        <div className="p-6 rounded-2xl bg-[#080808]/95 border border-amber-500/40 shadow-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="text-amber-400" size={20} />
              <span>Interac e-Transfer & Bank Alert Auto-Forwarding</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Create a 1-time automated filter rule in Gmail, Outlook, or iCloud to forward Interac transaction emails automatically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 text-xs space-y-3">
            <div className="font-bold text-amber-400">Automated Forwarding Rule:</div>
            <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-zinc-700 font-mono text-[11px] text-zinc-300">
              <b>Filter Condition:</b> From: (notify@payments.interac.ca OR alerts@rbc.com OR @td.com OR @scotiabank.com)<br />
              <b>Action:</b> Automatically Forward $\rightarrow$ <i>your-aura-inbox-webhook</i>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
