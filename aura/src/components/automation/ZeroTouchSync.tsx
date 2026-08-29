import { useState } from 'react';
import { 
  Mail, 
  Landmark, 
  CheckCircle, 
  Copy, 
  Radio, 
  ShieldCheck, 
  } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ZeroTouchSync() {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [activeChannel, setActiveChannel] = useState<'ios' | 'android' | 'email' | 'plaid'>('ios');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const webhookUrl = window.location.origin + '/api/webhook/transaction';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-[#0a0a0a]/95 border border-zinc-800 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #e1143d)` }}
          >
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">100% Zero-Touch Real-Time Sync</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                0 Seconds Required
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automatically captures Apple Pay, Google Wallet, and Interac payments in the background with zero manual effort
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
          onClick={() => setActiveChannel('ios')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'ios'
              ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-base"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Recommended</span>
          </div>
          <div className="font-bold text-xs text-white">Apple Pay (iOS)</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Instant background shortcut</div>
        </button>

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
            <span className="text-base">🤖</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Android</span>
          </div>
          <div className="font-bold text-xs text-white">Google / Samsung Wallet</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Notification auto-bridge</div>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Interac</span>
          </div>
          <div className="font-bold text-xs text-white">Interac e-Transfer Auto-Rules</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Gmail / Outlook forwarding</div>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Open Banking</span>
          </div>
          <div className="font-bold text-xs text-white">Bank API Direct Sync</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Plaid / Flinks connector</div>
        </button>
      </div>

      {/* CHANNEL 1: APPLE PAY / IOS SHORTCUT AUTOMATION */}
      {activeChannel === 'ios' && (
        <div className="p-6 rounded-2xl bg-[#0a0a0a]/95 border border-zinc-800 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span> Apple Pay Real-Time Automation</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Built into iPhone
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Whenever you tap your iPhone or Apple Watch at any store, iOS wakes up a background shortcut that automatically posts the transaction data to Aura.
              </p>
            </div>
          </div>

          {/* Step by step guide */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <b className="text-white">Open the "Shortcuts" App on your iPhone</b>
                <p className="text-zinc-400 mt-0.5">Tap the <b>Automation</b> tab at the bottom $ightarrow$ Tap <b>+ (New Automation)</b>.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <b className="text-white">Select "Transaction" (or "When I use Apple Pay")</b>
                <p className="text-zinc-400 mt-0.5">Choose <b>Any Card</b> (or select your RBC / TD / Scotia / Tangerine card) $ightarrow$ Select <b>Run Immediately (No confirmation)</b>.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div className="w-full">
                <b className="text-white">Add Action: "Get Contents of URL" (HTTP POST)</b>
                <p className="text-zinc-400 mt-0.5 mb-2">Set Method to <b>POST</b> and paste your webhook endpoint URL:</p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-zinc-700 font-mono text-[11px] text-cyan-300">
                  <span className="truncate">{webhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook-url')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white ml-2 flex-shrink-0"
                  >
                    {copiedText === 'webhook-url' ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
            <div>
              <b>Zero-Touch Result:</b> The moment you tap for coffee or groceries, iOS sends the transaction to Aura in the background without unlocking your phone.
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL 2: ANDROID / GOOGLE WALLET */}
      {activeChannel === 'android' && (
        <div className="p-6 rounded-2xl bg-[#0a0a0a]/95 border border-zinc-800 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🤖 Android Google / Samsung Wallet Notification Bridge</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                100% Automatic
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              On Android, Google Wallet or your bank app (TD, RBC, Scotia) displays an instant payment push notification. MacroDroid or Tasker automatically intercepts this notification and forwards it to Aura.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <b className="text-white">Install MacroDroid (Free on Google Play Store)</b>
                <p className="text-zinc-400 mt-0.5">MacroDroid is a lightweight Android automation app with zero battery impact.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <b className="text-white">Trigger: Notification Received $ightarrow$ Select (Google Wallet / Bank App)</b>
                <p className="text-zinc-400 mt-0.5">Select Google Wallet, TD, RBC, or Scotiabank as the monitored notification source.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div className="w-full">
                <b className="text-white">Action: HTTP Request $ightarrow$ POST to Aura Webhook</b>
                <p className="text-zinc-400 mt-0.5 mb-2">Send notification title and body directly to your endpoint:</p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-zinc-700 font-mono text-[11px] text-cyan-300">
                  <span className="truncate">{webhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook-url-android')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white ml-2 flex-shrink-0"
                  >
                    {copiedText === 'webhook-url-android' ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL 3: EMAIL & INTERAC AUTO-FORWARDER */}
      {activeChannel === 'email' && (
        <div className="p-6 rounded-2xl bg-[#0a0a0a]/95 border border-zinc-800 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📧 Interac e-Transfer & Bank Alert Auto-Forwarding</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Create a 1-time automated filter rule in Gmail, Outlook, or iCloud to forward receipts automatically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 text-xs space-y-3">
            <div className="font-bold text-amber-400">Automated Forwarding Rule:</div>
            <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-zinc-700 font-mono text-[11px] text-zinc-300">
              <b>Filter Condition:</b> From: (notify@payments.interac.ca OR alerts@rbc.com OR @td.com OR @scotiabank.com)<br />
              <b>Action:</b> Automatically Forward $ightarrow$ <i>your-aura-inbox-webhook</i>
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL 4: CANADIAN OPEN BANKING (PLAID / FLINKS) */}
      {activeChannel === 'plaid' && (
        <div className="p-6 rounded-2xl bg-[#0a0a0a]/95 border border-zinc-800 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🏦 Direct Canadian Open Banking Sync (Plaid & Flinks)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Connect your TD, RBC, Scotiabank, BMO, CIBC, or Tangerine accounts via bank API tokens for continuous ledger sync.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#000000] border border-zinc-800 text-xs space-y-3">
            <p className="text-zinc-300">
              Aura supports direct bank OAuth token ingestion via Canadian Open Banking providers (Plaid Canada and Flinks). Once configured with your Supabase credentials, your bank ledger syncs daily in the background.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
