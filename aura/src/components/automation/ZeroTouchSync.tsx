import { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle, 
  Copy, 
  Smartphone, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Radio, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface WebhookLog {
  id: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  statusCode: number;
  rawTitle: string;
  rawText: string;
  merchant?: string;
  amount?: number;
  category?: string;
  currency?: string;
  error?: string;
}

export function ZeroTouchSync() {
  const { user } = useAuth();

  const [activeChannel, setActiveChannel] = useState<'android' | 'ios' | 'email' | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live Webhook Activity Feed
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const currentOrigin = window.location.origin;
  const userParam = user?.id ? `?user_id=${user.id}` : '';
  const webhookUrl = `${currentOrigin}/api/webhook/transaction${userParam}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleToggleChannel = (channel: 'android' | 'ios' | 'email') => {
    setActiveChannel((prev) => (prev === channel ? null : channel));
  };

  // Fetch Live Webhook Activity Logs
  const fetchWebhookLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const url = user?.id ? `/api/webhook/logs?user_id=${user.id}` : '/api/webhook/logs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data.logs || []);
      }
    } catch (e) {
      // Quiet fail if offline
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchWebhookLogs();
    const interval = setInterval(fetchWebhookLogs, 3500);
    return () => clearInterval(interval);
  }, [user]);

  const handleSendTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhook/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Google Wallet',
          message: 'Paid $4.25 to Tim Hortons with Visa •••• 3896',
          currency: 'CAD',
          user_id: user?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: 'HTTP 200 OK! Test transaction parsed & logged to your Ledger.',
        });
        fetchWebhookLogs();
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
    <div className="space-y-4 text-slate-100 max-w-5xl mx-auto">
      {/* 1. Sleek 3 Channel Accordion Buttons */}
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

      {/* 2. Expandable Setup Guides */}
      <AnimatePresence mode="wait">
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
                  MacroDroid captures payment notifications in under 1 second and posts them to your Aura webhook.
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
                  <b className="text-white text-xs">Trigger: Notification Received → Pick (Google Wallet / Bank App)</b>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                <div className="w-full space-y-2">
                  <b className="text-white text-xs">Action: HTTP Request (POST) → Webhook URL</b>

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

                    <div className="text-[10px] text-zinc-400 font-mono">
                      <b>Request Body (JSON):</b> <code className="text-cyan-300">&#123;&quot;title&quot;: &quot;[not_title]&quot;, &quot;message&quot;: &quot;[not_text]&quot;&#125;</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
                  <b className="text-white text-xs">Shortcuts App → Automation → Transaction (Apple Pay)</b>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#000000] border border-zinc-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                <div className="w-full space-y-1.5">
                  <b className="text-white text-xs">Action: &quot;Get Contents of URL&quot; (POST to Webhook)</b>
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

      {/* 3. LIVE WEBHOOK ACTIVITY FEED & MOBILE DEBUGGER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080808] border border-zinc-800 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Activity size={16} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Live Webhook Activity Feed</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
              </h3>
              <p className="text-[10px] sm:text-[11px] text-zinc-400">
                Real-time debugger for phone tap-to-pay & bank notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSendTestWebhook}
              disabled={isTestingWebhook}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-md"
            >
              <Zap size={11} />
              <span>{isTestingWebhook ? 'Sending...' : 'Test Ping'}</span>
            </button>

            <button
              type="button"
              onClick={fetchWebhookLogs}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw size={13} className={isLoadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-2 rounded-xl text-[11px] font-mono flex items-center gap-1.5 ${
            testResult.success ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
          }`}>
            {testResult.success ? <CheckCircle2 size={13} className="flex-shrink-0" /> : <AlertCircle size={13} className="flex-shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="space-y-2">
          {webhookLogs.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800/80 text-center space-y-1.5">
              <Radio size={18} className="text-zinc-600 mx-auto animate-pulse" />
              <p className="text-xs text-zinc-400 font-medium">Listening for live payment notifications...</p>
              <p className="text-[10px] text-zinc-500">
                When you tap your phone at Dollarama, the captured payment will appear here live within 1 second.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto pr-1 space-y-1.5">
              {webhookLogs.map((log) => (
                <div key={log.id} className="pt-2 first:pt-0 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <b className="text-white text-xs">{log.merchant || log.rawTitle}</b>
                      {log.amount && (
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          ${Number(log.amount).toFixed(2)} {log.currency || 'CAD'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#000000] border border-zinc-850 text-[11px] font-mono text-zinc-300 space-y-0.5">
                    <div className="text-zinc-400 truncate">
                      <span className="text-zinc-500">Raw: </span>
                      &quot;{log.rawText}&quot;
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-0.5">
                      <span className="text-cyan-400 font-sans">
                        Category: <b>{log.category || 'Shopping'}</b>
                      </span>
                      <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        {log.statusCode || 200} OK • Saved to Ledger
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
