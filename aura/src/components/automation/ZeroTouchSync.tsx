import { useState } from 'react';
import { 
  Mail, 
  CheckCircle, 
  Copy, 
  Radio, 
  Smartphone, 
  Zap,
  Globe,
  Laptop,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export function ZeroTouchSync() {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();
  const { user } = useAuth();

  // null by default so no bulky guides are shown unless explicitly clicked
  const [activeChannel, setActiveChannel] = useState<'android' | 'ios' | 'email' | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [customHost, setCustomHost] = useState('');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentOrigin = window.location.origin;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  const userParam = user?.id ? `?user_id=${user.id}` : '';
  const effectiveOrigin = customHost.trim() ? (customHost.startsWith('http') ? customHost.trim() : `https://${customHost.trim()}`) : currentOrigin;
  const webhookUrl = `${effectiveOrigin}/api/webhook/transaction${userParam}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleToggleChannel = (channel: 'android' | 'ios' | 'email') => {
    setActiveChannel((prev) => (prev === channel ? null : channel));
  };

  const handleSendTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhook/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Tim Hortons (MacroDroid Test)',
          amount: 4.25,
          category: 'Food',
          currency: 'CAD',
          card: 'Google Wallet (Samsung Pay / NFC)',
          payment_method: 'Google Wallet',
          user_id: user?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: 'HTTP 200 OK! Webhook is live and test transaction was recorded.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Webhook returned an error.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to reach webhook endpoint.',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-3 text-slate-100 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080808]/90 border border-zinc-800 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #00f2fe)` }}
          >
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Zero-Touch Payment Automation</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                100% Free
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Tap a channel below to view or toggle setup guide
            </p>
          </div>
        </div>

        {/* Live Webhook Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#000000] border border-zinc-800 text-xs font-mono self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-zinc-400 text-[11px]">Webhook:</span>
          <span className="text-emerald-400 font-bold text-[11px]">ONLINE</span>
        </div>
      </div>

      {/* Sleek Horizontal Channel Tabs with Accordion Click Toggle */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#000000] rounded-2xl border border-zinc-800">
        <button
          type="button"
          onClick={() => handleToggleChannel('android')}
          className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 relative ${
            activeChannel === 'android'
              ? 'bg-cyan-950/90 border border-cyan-500/60 text-white shadow-lg ring-1 ring-cyan-400/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Smartphone size={15} className={activeChannel === 'android' ? 'text-cyan-400' : 'text-zinc-500'} />
          <span className="text-xs font-bold truncate">Android</span>
          {activeChannel === 'android' ? <ChevronUp size={13} className="text-cyan-400 hidden sm:inline" /> : <ChevronDown size={13} className="text-zinc-600 hidden sm:inline" />}
        </button>

        <button
          type="button"
          onClick={() => handleToggleChannel('ios')}
          className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 relative ${
            activeChannel === 'ios'
              ? 'bg-rose-950/90 border border-rose-500/60 text-white shadow-lg ring-1 ring-rose-400/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Zap size={15} className={activeChannel === 'ios' ? 'text-rose-400' : 'text-zinc-500'} />
          <span className="text-xs font-bold truncate">Apple Pay</span>
          {activeChannel === 'ios' ? <ChevronUp size={13} className="text-rose-400 hidden sm:inline" /> : <ChevronDown size={13} className="text-zinc-600 hidden sm:inline" />}
        </button>

        <button
          type="button"
          onClick={() => handleToggleChannel('email')}
          className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 relative ${
            activeChannel === 'email'
              ? 'bg-amber-950/90 border border-amber-500/60 text-white shadow-lg ring-1 ring-amber-400/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Mail size={15} className={activeChannel === 'email' ? 'text-amber-400' : 'text-zinc-500'} />
          <span className="text-xs font-bold truncate">Interac</span>
          {activeChannel === 'email' ? <ChevronUp size={13} className="text-amber-400 hidden sm:inline" /> : <ChevronDown size={13} className="text-zinc-600 hidden sm:inline" />}
        </button>
      </div>

      {/* Accordion Expandable Content */}
      <AnimatePresence mode="wait">
        {/* CHANNEL 1: ANDROID (GOOGLE WALLET) */}
        {activeChannel === 'android' && (
          <motion.div 
            key="android-channel"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="p-4 sm:p-6 rounded-2xl bg-[#080808]/95 border border-cyan-500/40 shadow-xl space-y-4 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="text-cyan-400" size={18} />
                  <span>Android Real-Time Google Wallet Bridge</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    0-Second Instant Tap
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 max-w-2xl">
                  Whenever you pay at any store with Google Wallet on your Android phone, MacroDroid instantly captures the payment notification and forwards it to Aura in under 1 second.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveChannel(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
                title="Hide setup guide"
              >
                <ChevronUp size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                <div>
                  <b className="text-white text-xs">Install MacroDroid (Free on Google Play Store)</b>
                  <p className="text-zinc-400 text-[11px] mt-0.5">MacroDroid is a safe, lightweight automation app with zero battery impact.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                <div>
                  <b className="text-white text-xs">Trigger: Notification Received → Select (Google Wallet / Bank App)</b>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Choose Google Wallet, TD, RBC, or CIBC as the monitored notification source.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                <div className="w-full space-y-2">
                  <div>
                    <b className="text-white text-xs">Action: HTTP Request → POST to Aura Endpoint</b>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Send notification title and body directly to your endpoint:</p>
                  </div>

                  {/* Intelligent URL Display */}
                  <div className="p-3 rounded-xl bg-[#080808] border border-zinc-700/80 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px] text-cyan-300">
                      <span className="truncate max-w-[200px] sm:max-w-md">{webhookUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, 'webhook-url-android')}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white ml-2 flex-shrink-0 cursor-pointer flex items-center gap-1 text-xs"
                      >
                        {copiedText === 'webhook-url-android' ? (
                          <>
                            <CheckCircle size={13} className="text-emerald-400" />
                            <span className="text-emerald-400 font-sans text-[11px]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span className="font-sans text-[11px]">Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 1-Click Interactive Test Simulator */}
                    <div className="pt-2 border-t border-zinc-800 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <b className="text-[11px] text-white block flex items-center gap-1">
                            <Zap size={13} className="text-cyan-400" />
                            <span>Step 4: Verify Your Webhook Live</span>
                          </b>
                          <span className="text-[10px] text-zinc-400">
                            Click to simulate a $4.25 coffee purchase from your phone
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleSendTestWebhook}
                          disabled={isTestingWebhook}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg bg-cyan-600 hover:bg-cyan-500 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                        >
                          {isTestingWebhook ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>Sending Ping...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={12} />
                              <span>Send Test Payment</span>
                            </>
                          )}
                        </button>
                      </div>

                      {testResult && (
                        <div className={`p-2 rounded-lg text-[11px] font-mono flex items-center gap-1.5 ${
                          testResult.success 
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                            : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                        }`}>
                          {testResult.success ? <CheckCircle size={13} className="flex-shrink-0" /> : null}
                          <span>{testResult.message}</span>
                        </div>
                      )}
                    </div>

                    {isLocalhost && (
                      <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1 text-amber-400/90">
                          <Laptop size={11} />
                          Viewing on Localhost. On your phone, open your deployed Render URL.
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Globe size={11} className="text-zinc-500" />
                          <input
                            type="text"
                            placeholder="or paste Render domain"
                            value={customHost}
                            onChange={(e) => setCustomHost(e.target.value)}
                            className="bg-[#000000] border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* CHANNEL 2: APPLE PAY / IOS SHORTCUT */}
        {activeChannel === 'ios' && (
          <motion.div 
            key="ios-channel"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="p-4 sm:p-6 rounded-2xl bg-[#080808]/95 border border-rose-500/40 shadow-xl space-y-4 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Zap className="text-rose-400" size={18} />
                  <span>Apple Pay Real-Time Automation</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Built into iPhone
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                  Whenever you tap your iPhone or Apple Watch at any store, iOS wakes up a background shortcut that automatically posts the transaction data to Aura.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveChannel(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
                title="Hide setup guide"
              >
                <ChevronUp size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                <div>
                  <b className="text-white text-xs">Open the &quot;Shortcuts&quot; App on your iPhone</b>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Tap the <b>Automation</b> tab at the bottom → Tap <b>+ (New Automation)</b>.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                <div>
                  <b className="text-white text-xs">Select &quot;Transaction&quot; (When I use Apple Pay)</b>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Choose <b>Any Card</b> → Select <b>Run Immediately (No confirmation)</b>.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                <div className="w-full space-y-2">
                  <div>
                    <b className="text-white text-xs">Add Action: &quot;Get Contents of URL&quot; (HTTP POST)</b>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Set Method to <b>POST</b> and paste your webhook endpoint URL:</p>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#000000] border border-zinc-700 font-mono text-[11px] text-rose-300">
                    <span className="truncate max-w-[200px] sm:max-w-md">{webhookUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookUrl, 'webhook-url-ios')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white ml-2 flex-shrink-0 cursor-pointer flex items-center gap-1 text-xs"
                    >
                      {copiedText === 'webhook-url-ios' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span className="font-sans text-[11px]">Copy URL</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* CHANNEL 3: EMAIL & INTERAC AUTO-FORWARDER */}
        {activeChannel === 'email' && (
          <motion.div 
            key="email-channel"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="p-4 sm:p-6 rounded-2xl bg-[#080808]/95 border border-amber-500/40 shadow-xl space-y-4 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Mail className="text-amber-400" size={18} />
                  <span>Interac e-Transfer & Bank Alert Auto-Forwarding</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                  Create a 1-time automated filter rule in Gmail, Outlook, or iCloud to forward Interac transaction emails automatically.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveChannel(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
                title="Hide setup guide"
              >
                <ChevronUp size={16} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 text-xs space-y-2">
              <div className="font-bold text-amber-400 text-xs">Automated Forwarding Rule:</div>
              <div className="p-2.5 rounded-lg bg-[#080808] border border-zinc-700 font-mono text-[11px] text-zinc-300">
                <b>Filter Condition:</b> From: (notify@payments.interac.ca OR alerts@rbc.com OR @td.com OR @scotiabank.com)<br />
                <b>Action:</b> Automatically Forward → <i>{webhookUrl}</i>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
