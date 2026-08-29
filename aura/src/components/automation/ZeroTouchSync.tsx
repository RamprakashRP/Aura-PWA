import { useState } from 'react';
import { 
  Mail, 
  CheckCircle, 
  Copy, 
  Radio, 
  Smartphone,
  Zap
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ZeroTouchSync() {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [activeChannel, setActiveChannel] = useState<'android' | 'ios' | 'email'>('android');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const webhookUrl = window.location.origin + '/api/webhook/transaction';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
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
              <h2 className="text-xl font-black text-white tracking-tight">Zero-Touch Payment Automation</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                100% Free & Live
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automatically capture Canadian spending from your Samsung S26 Ultra, Google Wallet, Apple Pay, and Interac
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveChannel('android')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'android'
              ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg ring-1 ring-cyan-500/50'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Smartphone size={18} className="text-cyan-400" />
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300">
              Recommended (Samsung / Android)
            </span>
          </div>
          <div className="font-bold text-sm text-white">Google / Samsung Wallet Tap</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Instant MacroDroid notification bridge (0 seconds)</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel('ios')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'ios'
              ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg ring-1 ring-rose-500/50'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Zap size={18} className="text-rose-400" />
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300">
              iOS / Apple Watch
            </span>
          </div>
          <div className="font-bold text-sm text-white">Apple Pay Shortcuts</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Native background automation for iPhone</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel('email')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeChannel === 'email'
              ? 'border-amber-500 bg-amber-500/10 text-white shadow-lg ring-1 ring-amber-500/50'
              : 'border-zinc-800 bg-[#080808]/70 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Mail size={18} className="text-amber-400" />
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300">
              Interac e-Transfer
            </span>
          </div>
          <div className="font-bold text-sm text-white">Email Auto-Forwarding</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Gmail / Outlook 1-time automated rule</div>
        </button>
      </div>

      {/* CHANNEL 1: ANDROID / SAMSUNG S26 GOOGLE WALLET */}
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

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <b className="text-white">Install MacroDroid (Free on Google Play Store)</b>
                <p className="text-zinc-400 mt-0.5">MacroDroid is a safe, lightweight automation app that runs locally with zero battery impact.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <b className="text-white">Trigger: Notification Received $\rightarrow$ Select (Google Wallet / Bank App)</b>
                <p className="text-zinc-400 mt-0.5">Choose Google Wallet, TD, RBC, or Scotiabank as the monitored notification source.</p>
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

      {/* CHANNEL 2: APPLE PAY / IOS SHORTCUT */}
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

      {/* CHANNEL 3: EMAIL & INTERAC AUTO-FORWARDER */}
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
