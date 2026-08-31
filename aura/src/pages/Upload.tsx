import { ZeroTouchSync } from '../components/automation/ZeroTouchSync';
import { ReceiptScannerModal } from '../components/expenses/ReceiptScannerModal';
import { useState, useEffect } from 'react';
import { 
  Upload as UploadIcon, 
  FileJson, 
  CheckCircle, 
  Trash2, 
  Camera, 
  Receipt,
  AlertTriangle,
  History
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SyncHistoryItem {
  id: string;
  fileName: string;
  date: string;
  count: number;
  status: 'Success' | 'Void';
}

export default function Upload() {
  const { user } = useAuth();
  const { getAuraColor, getAuraGlow } = useTheme();
  const auraColor = getAuraColor();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'review' | 'importing' | 'success'>('idle');
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  
  // State for Review Screen
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [hasDuplicatesOnly, setHasDuplicatesOnly] = useState(false);
  const [statementCurrency] = useState('CAD');
  const [bankType] = useState('auto');
  const [detectedBank, setDetectedBank] = useState<string>('');
  const [recentSyncs, setRecentSyncs] = useState<SyncHistoryItem[]>([]);

  // Load user's real synchronization history
  useEffect(() => {
    if (user?.id) {
      const savedSyncs = localStorage.getItem(`aura_recent_syncs_${user.id}`);
      if (savedSyncs) {
        try {
          setRecentSyncs(JSON.parse(savedSyncs));
        } catch (e) {
          setRecentSyncs([]);
        }
      } else {
        setRecentSyncs([]);
      }
    }
  }, [user?.id]);

  const saveSyncHistory = (newItem: SyncHistoryItem) => {
    if (!user?.id) return;
    const updated = [newItem, ...recentSyncs.filter(s => s.fileName !== newItem.fileName)].slice(0, 5);
    setRecentSyncs(updated);
    localStorage.setItem(`aura_recent_syncs_${user.id}`, JSON.stringify(updated));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setStatus('processing');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);
          
          const response = await fetch('/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64: base64, bankType: bankType }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const result = await response.json();
          if (result.error) throw new Error(result.error);
          
          let incomingTransactions = [];
          if (result.bank && result.transactions) {
            setDetectedBank(result.bank);
            incomingTransactions = result.transactions;
          } else {
            incomingTransactions = Array.isArray(result) ? result : [];
          }

          if (user && incomingTransactions.length > 0) {
            const { data: existingRecords } = await supabase
              .from('transactions')
              .select('transaction_id')
              .eq('user_id', user.id);
            
            if (existingRecords) {
              const existingIds = new Set(existingRecords.map((r: any) => r.transaction_id));
              const freshTransactions = incomingTransactions.filter((tx: any) => !existingIds.has(tx.transaction_id));
              if (freshTransactions.length === 0) {
                setHasDuplicatesOnly(true);
              } else {
                setHasDuplicatesOnly(false);
              }
            }
          }

          setParsedData(incomingTransactions);
          saveSyncHistory({
            id: `sync-${Date.now()}`,
            fileName: file.name,
            date: new Date().toLocaleDateString(),
            count: incomingTransactions.length,
            status: 'Success'
          });
          setStatus('review');
        } catch (err: any) {
          console.error(err);
          saveSyncHistory({
            id: `sync-${Date.now()}`,
            fileName: file.name,
            date: new Date().toLocaleDateString(),
            count: 0,
            status: 'Void'
          });
          alert("Error parsing PDF statement: " + (err.message || err));
          setStatus('idle');
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      alert("Execution error: " + e.message);
      setStatus('idle');
    }
  };

  const handleWipeDatabase = async () => {
    if (!user?.id) return;
    const confirmWipe = window.confirm("⚠️ DANGER: Are you sure you want to wipe ALL transactions and sync history? This cannot be undone.");
    if (!confirmWipe) return;

    setIsWiping(true);
    try {
      // 1. Delete user transactions from Supabase
      const { error } = await supabase.from('transactions').delete().eq('user_id', user.id);
      if (error) throw error;

      // 2. Clear real sync history
      localStorage.removeItem(`aura_recent_syncs_${user.id}`);
      setRecentSyncs([]);
      setFile(null);
      setParsedData([]);
      setStatus('idle');

      alert("Universal Ledger & Sync History wiped cleanly.");
    } catch (err: any) {
      console.error('Wipe failed:', err);
      alert("Failed to wipe database: " + err.message);
    } finally {
      setIsWiping(false);
    }
  };

  const confirmImport = async () => {
    if (!user) return;
    setStatus('importing');

    const payload = parsedData.map(tx => ({
      transaction_id: tx.transaction_id,
      date: tx.date,
      description: tx.description || tx.raw_description || "Bank Transaction",
      category: tx.category || "Miscellaneous",
      amount: tx.amount,
      currency: statementCurrency,
      visibility: tx.visibility || 'Private',
      bank: detectedBank || bankType,
      user_id: user.id
    }));

    const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'transaction_id' });
    if (error) {
      alert("Import error: " + error.message);
      setStatus('review');
    } else {
      setStatus('success');
    }
  };

  return (
    <>
      {showReceiptScanner && (
        <ReceiptScannerModal 
          onClose={() => setShowReceiptScanner(false)} 
          onReceiptProcessed={() => setShowReceiptScanner(false)} 
        />
      )}

      {/* Main Container with ample bottom padding so mobile navigation bar never blocks elements */}
      <div className="min-h-screen bg-[#000000] text-slate-100 px-4 sm:px-6 pt-4 pb-36 space-y-6 max-w-5xl mx-auto">
        
        {/* Top Header with subtle Wipe Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-zinc-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>AWAKEN</span>
              <span style={{ color: auraColor }}>AURA</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Zero-touch bank bridges, receipt OCR scanner & statement ingestion
            </p>
          </div>

          <button
            type="button"
            onClick={handleWipeDatabase}
            disabled={isWiping}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 size={13} />
            <span>{isWiping ? 'Wiping...' : 'Wipe All Records'}</span>
          </button>
        </div>

        {/* Section 1: Zero-Touch Automation (Android, Apple Pay, Email) */}
        <ZeroTouchSync />

        {/* Section 2: Smart Receipt & E-Bill Scanner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080808]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, ${auraColor}, #00f2fe)` }}
          />
          <div className="flex items-center gap-3.5">
            <div 
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <Camera size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Smart Receipt & E-Bill Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Itemized OCR + Split
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 max-w-xl">
                Snap physical receipts or upload PDF e-bills. Aura extracts line items and lets you split equally, by %, or custom amounts with roommates!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowReceiptScanner(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl cursor-pointer transition-all hover:scale-105 flex items-center justify-center gap-2 flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
          >
            <Receipt size={15} />
            <span>📸 Scan & Split Bill</span>
          </button>
        </div>

        {/* Section 3: Batch Statement Parsing Dropzone */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xs uppercase font-bold tracking-widest text-zinc-400">
              Batch Statement Parsing Dropzone
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">PDF & CSV Support</span>
          </div>

          <motion.div 
            animate={dragActive ? { boxShadow: getAuraGlow(), borderColor: auraColor } : { borderColor: '#27272a' }}
            className="p-6 sm:p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all bg-[#080808] relative min-h-[160px]"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#000000] flex items-center justify-center mb-3 shadow-xl border border-zinc-800">
              <UploadIcon size={22} style={{ color: auraColor }} className={dragActive ? 'animate-bounce' : 'opacity-80'} />
            </div>
            
            <h4 className="text-sm sm:text-base font-bold text-white mb-1 tracking-wide">
              Drop Statement PDF Here
            </h4>
            <p className="text-zinc-400 text-xs mb-4 text-center max-w-sm">
              Supports Canadian & Indian bank statements. Neural engine categorizes transactions automatically.
            </p>

            <label 
              className="cursor-pointer bg-[#000000] border hover:bg-[#0a0a0a] border-zinc-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 shadow-xl"
            >
              <FileJson size={16} style={{ color: auraColor }} />
              <span>Choose Statement File</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".csv,.pdf" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </motion.div>

          {/* Real Dynamic Recent Synchronizations */}
          {recentSyncs.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#080808] border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                <History size={13} className="text-cyan-400" />
                <span>Recent Synchronizations ({recentSyncs.length})</span>
              </div>
              <div className="space-y-2">
                {recentSyncs.map((sync) => (
                  <div 
                    key={sync.id}
                    className="flex justify-between items-center text-xs font-mono p-2.5 rounded-xl bg-[#000000] border border-zinc-800"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[220px] sm:max-w-md">
                      <span className="text-zinc-300 font-medium truncate">{sync.fileName}</span>
                      <span className="text-zinc-500 text-[10px]">({sync.date})</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      sync.status === 'Success' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                    }`}>
                      {sync.status === 'Success' ? `${sync.count} Parsed` : 'Void'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Selected Action Bar */}
          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-5 rounded-2xl bg-[#080808] border border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ready to Parse</p>
                <p className="text-white font-mono text-xs font-bold">{file.name} <span className="text-zinc-500 font-normal">({(file.size / 1024).toFixed(1)} KB)</span></p>
              </div>
              
              <button 
                onClick={handleProcess}
                disabled={status !== 'idle'}
                className="w-full sm:w-auto rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider text-white shadow-xl cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
              >
                {status === 'idle' && 'Execute Neural Parse'}
                {status === 'processing' && (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting Transactions...</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        {/* Review Modal / Screen */}
        {status === 'review' && (
          <div className="p-5 rounded-2xl bg-[#080808] border border-zinc-700 space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white">Review Extracted Statement</h3>
                <p className="text-xs text-zinc-400">Detected {parsedData.length} transactions from {detectedBank || file?.name}</p>
              </div>
              <button
                type="button"
                onClick={confirmImport}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
              >
                Confirm & Import to Ledger
              </button>
            </div>

            {hasDuplicatesOnly && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>All transactions in this statement have already been imported previously.</span>
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2 animate-in zoom-in-95">
            <CheckCircle className="text-emerald-400 mx-auto" size={28} />
            <h3 className="text-base font-bold text-white">Statement Ingested Successfully!</h3>
            <p className="text-xs text-zinc-400">All transactions are now available in your Universal Ledger.</p>
          </div>
        )}
      </div>
    </>
  );
}
