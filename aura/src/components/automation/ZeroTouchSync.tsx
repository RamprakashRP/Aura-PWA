import { useState } from 'react';
import { 
  Mail, 
  CheckCircle, 
  Copy, 
  Smartphone, 
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export function ZeroTouchSync() {
  const { user } = useAuth();

  const [activeChannel, setActiveChannel] = useState<'android' | 'ios' | 'email' | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentOrigin = window.location.origin;
  
  const userParam = user?.id ? `?user_id=${user.id}` : '';
  const effectiveOrigin = currentOrigin;
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
    <div className="space-y-2.5 text-slate-100 max-w-5xl mx-auto">
      {/* Sleek Horizontal 3 Channel Buttons (Click to open, click again to close) */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#000000] rounded-2xl border border-zinc-800">
        <button
          type="button"
          onClick={() => handleToggleChannel('android')}
          className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeChannel === 'android'
              ? 'bg-cyan-950/90 border border-cyan-500/60 text-white shadow-lg ring-1 ring-cyan-400/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Smartphone size={15} className={activeChannel === 'android' ? 'text-cyan-400' : 'text-zinc-500'} />
          <span className="text-xs font-bold truncate">Android Pay</span>
          {activeChannel === 'android' ? <ChevronUp size={12} className="text-cyan-400" /> : <ChevronDown size={12} className="text-zinc-600" />}
        </button>

        <button
          type="button"
          onClick={() => handleToggleChannel('ios')}
          className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeChannel === 'ios'
              ? 'bg-rose-950/90 border border-rose-500/60 text-white shadow-lg ring-1 ring-rose-400/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Zap size={15} className={activeChannel === 'ios' ? 'text-rose-400' : 'text-zinc-500'} />
          <span className="text-xs font-bold truncate">Apple Pay</span>
          {activeChannel === 'ios' ? <ChevronUp size={12} className="text-rose-400" /> : <ChevronDown size={12} className="text-zinc-600" />}
        </button>

        <button
          type="button"
          onClick={() => handleToggleChannel('email')}
          className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeChannel === 'email'
              ? 'bg-amber-950/90 border border-amber-500/60 text-white shadow-lg ring-1 ring-amber-400/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Mail size={15} className={activeChannel === 'email' ? 'text-amber-400' : 'text-zinc-500'} />
          <span className="text-xs font-bold truncate">Interac e-Transfer</span>
          {activeChannel === 'email' ? <ChevronUp size={12} className="text-amber-400" /> : <ChevronDown size={12} className="text-zinc-600" />}
        </button>
      </div>

      {/* Expandable Channel Details */}
      <AnimatePresence mode="wait">
        {/* CHANNEL 1: ANDROID (GOOGLE WALLET) */}
        {activeChannel === 'android' && (
          <motion.div 
            key="android-channel"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-4 sm:p-5 rounded-2xl bg-[#080808]/95 border border-cyan-500/40 shadow-xl space-y-3.5 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="text-cyan-400" size={16} />
                  <span>Android Google Wallet & Bank Notifications Bridge</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xl">
                  Whenever you tap your phone to pay or receive bank alert notifications, MacroDroid captures it and posts to Aura in under 1 second.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveChannel(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <ChevronUp size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                <div>
                  <b className="text-white text-xs">Install MacroDroid (Free on Google Play Store)</b>
                  <p className="text-zinc-400 text-[10px]">Safe, lightweight automation app with zero battery impact.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                <div>
                  <b className="text-white text-xs">Trigger: Notification Received → Pick (Google Wallet / TD / RBC / CIBC)</b>
                  <p className="text-zinc-400 text-[10px]">Select your wallet and bank apps.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                <div className="w-full space-y-2">
                  <b className="text-white text-xs">Action: HTTP Request → POST to Webhook URL</b>

                  <div className="p-2.5 rounded-xl bg-[#080808] border border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px] text-cyan-300">
                      <span className="truncate max-w-[200px] sm:max-w-md">{webhookUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, 'webhook-url-android')}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white ml-2 flex-shrink-0 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        {copiedText === 'webhook-url-android' ? (
                          <>
                            <CheckCircle size={12} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-400">Test live connection ($4.25 coffee simulation):</span>
                      <button
                        type="button"
                        onClick={handleSendTestWebhook}
                        disabled={isTestingWebhook}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <Zap size={11} />
                        <span>Send Test</span>
                      </button>
                    </div>

                    {testResult && (
                      <div className={`p-1.5 rounded text-[10px] font-mono ${
                        testResult.success ? 'bg-emerald-950/80 text-emerald-300' : 'bg-rose-950/80 text-rose-300'
                      }`}>
                        {testResult.message}
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
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-4 sm:p-5 rounded-2xl bg-[#080808]/95 border border-rose-500/40 shadow-xl space-y-3.5 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="text-rose-400" size={16} />
                  <span>Apple Pay Real-Time iOS Automation</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Whenever you tap your iPhone or Apple Watch, iOS executes a background shortcut posting spending to Aura.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveChannel(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <ChevronUp size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                <div>
                  <b className="text-white text-xs">Open Shortcuts App on iPhone → Automation tab → New Automation</b>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                <div>
                  <b className="text-white text-xs">Trigger: Transaction (Apple Pay) → Run Immediately</b>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                <div className="w-full space-y-1.5">
                  <b className="text-white text-xs">Action: &quot;Get Contents of URL&quot; (POST)</b>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#000000] border border-zinc-700 font-mono text-[11px] text-rose-300">
                    <span className="truncate max-w-[200px] sm:max-w-md">{webhookUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookUrl, 'webhook-url-ios')}
                      className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white ml-2 flex-shrink-0 cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      {copiedText === 'webhook-url-ios' ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>Copy URL</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* CHANNEL 3: EMAIL & INTERAC */}
        {activeChannel === 'email' && (
          <motion.div 
            key="email-channel"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-4 sm:p-5 rounded-2xl bg-[#080808]/95 border border-amber-500/40 shadow-xl space-y-3 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="text-amber-400" size={16} />
                  <span>Interac e-Transfer & Email Auto-Forwarding</span>
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveChannel(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <ChevronUp size={15} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 text-xs space-y-1.5">
              <div className="font-bold text-amber-400 text-xs">1-Time Email Filter Rule:</div>
              <div className="p-2 rounded-lg bg-[#080808] border border-zinc-700 font-mono text-[10px] text-zinc-300">
                From: <i>(notify@payments.interac.ca OR alerts@rbc.com OR @td.com)</i><br />
                Forward to: <i>{webhookUrl}</i>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
