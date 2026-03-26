import { useState } from 'react';
import { Upload as UploadIcon, FileJson, CheckCircle, Edit2, Play, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// AI Categories mapping to Aura Colors
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#00FF41", // Hunter Green
  Transport: "#ADD8E6", // UI Silver
  Studies: "#FFD700", // SS Gold
  Shopping: "#FF4D4D", // Berserker Red
  Wearables: "#00FFFF", // Neon Cyan
  Groceries: "#FF8C00", // Sunset Orange
  Entertainment: "#8A2BE2", // Hollow Purple
  Miscellaneous: "#4A4A4A" // Void Black
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS);

const categorize = (desc: string) => {
  const d = desc.toLowerCase();
  const foodKeywords = [
     "food", "zomato", "swiggy", "starbucks", "tim hortons", "tims", "restaurant", "kozhi",
     "dosa", "idli", "vada", "sambar", "chutney", "biryani", "meals", "parotta", "chapati", "poori", "pongal", "upma", "bisi bele bath", "payasam", "chicken 65", "thali", "uttapam", "appam", "paniyaram", "bonda", "bajji", "kebab", "shawarma", "mandi", "tandoori", "naan", "kulcha", "pulao", "fried rice", "noodles", "momo", "gobi", "paneer", "manchurian", "soup", "filter coffee", "chai",
     "poutine", "pizza", "burger", "fries", "subway", "mcdonalds", "kfc", "wendys", "taco", "burrito", "sushi", "ramen", "pho", "wings", "bagel", "croissant", "donut", "pastry", "cake", "bacon", "steak", "bbq", "wrap", "salad", "smoothie", "boba", "bubble tea", "cafe", "bakery", "kitchen"
  ];
  if (["chicken", "meat", "grocery", "supermarket", "mart", "store", "d-mart", "reliance", "vegetable", "fruit", "milk", "dairy", "egg", "fish", "mutton"].some(k => d.includes(k))) return "Groceries";
  if (foodKeywords.some(k => d.includes(k))) return "Food";
  if (["uber", "ola", "metro", "oc transpo", "petrol", "shell", "transit", "presto", "cab"].some(k => d.includes(k))) return "Transport";
  if (["srm", "university", "coursera", "books", "ielts"].some(k => d.includes(k))) return "Studies";
  if (["amazon", "flipkart", "walmart", "myntra"].some(k => d.includes(k))) return "Shopping";
  if (["dress", "belt", "shirt", "pant", "shoe", "clothing", "apparel", "wear", "zara", "h&m", "uniqlo"].some(k => d.includes(k))) return "Wearables";
  if (["netflix", "valorant", "steam", "cinema"].some(k => d.includes(k))) return "Entertainment";
  return "Miscellaneous";
};

const Upload = () => {
  const { user } = useAuth();
  const { getAuraColor, getAuraGlow } = useTheme();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'review' | 'importing' | 'success'>('idle');
  
  // State for Review Screen
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [statementCurrency, setStatementCurrency] = useState('INR');
  const [bankType, setBankType] = useState('auto');
  const [detectedBank, setDetectedBank] = useState<string>('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
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
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds max timeout
          
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

          // Neural Duplicate Detection: cross-reference with existing DB records
          if (user && incomingTransactions.length > 0) {
             const { data: existingRecords, error: fetchError } = await supabase
               .from('transactions')
               .select('transaction_id')
               .eq('user_id', user.id);
             
             if (!fetchError && existingRecords) {
                const existingIds = new Set(existingRecords.map(r => r.transaction_id));
                // Filter out those already in the matrix
                const freshTransactions = incomingTransactions.filter((tx: any) => !existingIds.has(tx.transaction_id));
                
                const duplicateCount = incomingTransactions.length - freshTransactions.length;
                if (duplicateCount > 0) {
                   console.log(`Neural Filter: Purged ${duplicateCount} duplicate records found in the ledger.`);
                }
                setParsedData(freshTransactions);
             } else {
                setParsedData(incomingTransactions);
             }
          } else {
             setParsedData(incomingTransactions);
          }
          
          setStatus('review');
        } catch (fetchErr: any) {
             console.error(fetchErr);
             alert("Execution Failed: " + (fetchErr.name === 'AbortError' ? 'Parser timeout. Python script hung for too long.' : fetchErr.message));
             setStatus('idle');
        }
      };
    } catch (err: any) {
      console.error(err);
      alert("Failed to read PDF: " + err.message);
      setStatus('idle');
    }
  };

  const wipeDatabase = async () => {
    if (!window.confirm("Are you sure you want to wipe all transaction records? This cannot be undone.")) return;
    
    // Delete all records using the correct Primary Key
    if (!user) return;
    const { error } = await supabase.from('transactions')
      .delete()
      .eq('user_id', user.id);
    if (error) {
      alert("Error wiping DB: " + error.message);
    } else {
      alert("Database wiped successfully. Universal Ledger is now empty.");
    }
  };

  const handleReasonChange = (index: number, newReason: string) => {
    const updated = [...parsedData];
    updated[index].reason = newReason;
    
    // Auto-categorize based on the new custom typed reason logic
    if (newReason !== "Needed input") {
       updated[index].category = categorize(newReason);
    }
    
    setParsedData(updated);
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    const updated = [...parsedData];
    updated[index].category = newCategory;
    setParsedData(updated);
  };

  const confirmImport = async () => {
    if (!user) return;
    setStatus('importing');

    const payload = parsedData.map(tx => ({
      transaction_id: tx.transaction_id,
      date: tx.date,
      description: tx.reason || tx.merchant || tx.raw_description, // Map cleanly to UI Reason
      category: tx.category, // Map AI category
      amount: tx.amount,
      currency: statementCurrency, // Master override using user-selected native Statement Currency
      visibility: tx.visibility,
      user_id: user.id
    }));

    // Use UPSERT on transaction_id constraint to prevent duplicates
    const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'transaction_id' });
    
    if (error) {
      console.error(error);
      alert("Import error! " + error.message);
      setStatus('review');
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <header className="mb-6 md:mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center md:items-start gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase mt-4 md:mt-0">Awaken <span style={{ color: getAuraColor() }}>Aura</span></h1>
          <p className="text-slate-400 mt-1 md:mt-2 font-mono text-[10px] md:text-sm uppercase hidden md:block">Smart ML-Lite Categorization Engine</p>
        </div>
        <button 
           onClick={wipeDatabase}
           className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 w-full md:w-auto border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl md:rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors min-h-[44px]"
        >
           <Trash2 size={14} /> Wipe All Records 
        </button>
      </header>

      {status === 'idle' || status === 'processing' ? (
        <div className="space-y-6">
          <motion.div 
            animate={dragActive ? { boxShadow: getAuraGlow(), borderColor: getAuraColor() } : { borderColor: '#334155' }}
            className="glass p-6 md:p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all bg-[#0a0f1a] relative md:h-auto h-[25vh] min-h-[160px]"
            style={{ backgroundColor: dragActive ? `${getAuraColor()}05` : undefined }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-slate-900 flex items-center justify-center mb-3 md:mb-6 shadow-xl border border-slate-800">
              <UploadIcon size={24} style={{ color: getAuraColor() }} className={dragActive ? 'animate-bounce' : 'opacity-80 md:w-8 md:h-8'} />
            </div>
            
            <h3 className="hidden md:block text-xl font-bold text-white mb-2 tracking-wide uppercase">
              Inject Statement Data
            </h3>
            <p className="hidden md:block text-slate-500 text-sm mb-6 text-center max-w-sm">
              Upload PDF exports (Kotak format supported). Neural engine maps UPI/Merchant/Note directly.
            </p>

            <label 
               className="cursor-pointer bg-[#0a0f1a] border hover:bg-slate-900 border-slate-700 text-white font-black py-3 px-6 rounded-xl tracking-widest uppercase transition-colors flex items-center justify-center gap-3 w-full md:w-auto shadow-2xl min-h-[44px]"
               style={dragActive ? { borderColor: getAuraColor() } : {}}
            >
              <FileJson size={18} style={{ color: getAuraColor() }} />
              <span className="text-[10px] md:text-base">Tap to Upload Statement</span>
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

          {/* Quick History Status Bar (Mocked last 3 for UX immersion) */}
          <div className="md:hidden glass p-4 rounded-xl space-y-3 bg-[#020617]/50">
             <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest border-b border-slate-800 pb-2">Recent Synchronizations</h4>
             <div className="flex justify-between items-center text-[10px] font-mono p-2 rounded bg-green-500/10 border border-green-500/20 text-green-500">
                <span className="truncate max-w-[150px]">Kotak_Dec.pdf</span>
                <span>Success</span>
             </div>
             <div className="flex justify-between items-center text-[10px] font-mono p-2 rounded bg-green-500/10 border border-green-500/20 text-green-500">
                <span className="truncate max-w-[150px]">Kotak_Nov.pdf</span>
                <span>Success</span>
             </div>
             <div className="flex justify-between items-center text-[10px] font-mono p-2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                <span className="truncate max-w-[150px]">Kotak_Oct.pdf</span>
                <span>Void</span>
             </div>
          </div>

          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-4 md:p-6 rounded-2xl border-l-4 flex flex-col md:flex-row items-center justify-between gap-4 w-full"
              style={{ borderLeftColor: getAuraColor() }}
            >
              <div className="w-full md:w-auto text-center md:text-left">
                <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target Payload</p>
                <p className="text-white font-mono text-xs truncate max-w-[200px] md:max-w-none">{file.name} <span className="text-slate-500 text-[10px] ml-1">({(file.size / 1024).toFixed(1)} KB)</span></p>
              </div>
              
              <button 
                onClick={handleProcess}
                disabled={status !== 'idle'}
                className="w-full md:w-auto rounded-xl px-4 py-3 md:py-3 font-black text-[10px] md:text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 border fixed md:relative bottom-24 left-4 right-4 md:bottom-auto md:left-auto md:right-auto z-50 md:z-auto min-h-[44px] shadow-2xl md:shadow-none bg-[#0a0f1a] md:bg-transparent"
                style={{ 
                  color: getAuraColor(),
                  borderColor: `${getAuraColor()}40`,
                  boxShadow: status === 'idle' ? `0 10px 30px ${getAuraColor()}40` : 'none',
                  backgroundColor: status === 'idle' ? `${getAuraColor()}15` : undefined
                }}
              >
                {status === 'idle' && 'Execute Neural Parse'}
                {status === 'processing' && <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: getAuraColor(), borderTopColor: 'transparent' }}></div> Extracting...</span>}
              </button>
            </motion.div>
          )}
        </div>
      ) : status === 'review' || status === 'importing' ? (
        <motion.div 
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="glass rounded-2xl border overflow-hidden pb-24 md:pb-0 relative shadow-2xl"
           style={{ borderColor: `${getAuraColor()}20` }}
        >
           {/* High-Contrast Control Header */}
           <div className="p-5 md:p-8 border-b border-slate-800/50 flex flex-col xl:flex-row justify-between items-center bg-[#0a0f1a]/80 backdrop-blur-xl gap-6">
             <div className="text-center md:text-left">
               <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                 <div className="w-2 h-8 rounded-full" style={{ backgroundColor: getAuraColor(), boxShadow: `0 0 15px ${getAuraColor()}` }}></div>
                 <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">Review Imports</h3>
               </div>
               <p className="text-[10px] md:text-xs text-slate-500 font-mono tracking-widest uppercase">
                 <span style={{ color: getAuraColor() }}>{parsedData.length}</span> Records Synchronized • Verify Neural Mapping
               </p>
             </div>
             
             <div className="flex flex-wrap items-center justify-center md:justify-end gap-6 w-full xl:w-auto">
               {/* Modular Selectors */}
               <div className="flex gap-4">
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] text-center md:text-left">Bank Engine</span>
                    <select 
                       value={detectedBank || bankType}
                       onChange={(e) => {
                          const newBank = e.target.value;
                          setBankType(newBank);
                          setDetectedBank(newBank);
                          handleProcess();
                       }}
                       className="bg-[#020617] text-white text-[11px] font-bold uppercase tracking-widest border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none cursor-pointer transition-all hover:border-slate-600 min-w-[140px] appearance-none text-center shadow-lg"
                       style={{ 
                          boxShadow: `inset 0 0 10px ${getAuraColor()}05`,
                          borderLeft: `3px solid ${getAuraColor()}50`
                       }}
                    >
                       <option value="kotak">Kotak</option>
                       <option value="hdfc">HDFC</option>
                       <option value="jio">Jio</option>
                       <option value="union">Union</option>
                    </select>
                 </div>

                 <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] text-center md:text-left">Currency</span>
                    <select 
                       value={statementCurrency}
                       onChange={(e) => setStatementCurrency(e.target.value)}
                       className="bg-[#020617] text-white text-[11px] font-bold uppercase tracking-widest border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none cursor-pointer transition-all hover:border-slate-600 min-w-[100px] appearance-none text-center shadow-lg"
                       style={{ 
                          boxShadow: `inset 0 0 10px ${getAuraColor()}05`,
                          borderLeft: `3px solid ${getAuraColor()}50`
                       }}
                    >
                       {['INR', 'CAD', 'USD', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
               </div>
               
               {/* Level-Up Action Button */}
               <motion.button 
                  whileHover={{ scale: 1.02, filter: 'brightness(1.2)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmImport}
                  disabled={status === 'importing' || parsedData.length === 0}
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-white transition-all disabled:opacity-30 disabled:grayscale z-50 text-xs md:text-sm min-h-[56px] shadow-2xl relative overflow-hidden group"
                  style={{ 
                    background: `linear-gradient(135deg, ${getAuraColor()}, ${getAuraColor()}dd)`,
                    boxShadow: `0 15px 40px ${getAuraColor()}40`
                  }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {status === 'importing' ? (
                     <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                     <>
                       <Play size={18} fill="white" className="drop-shadow-lg" /> 
                       <span>Confirm & Commit</span>
                     </>
                  )}
                </motion.button>
              </div>
           </div>
           
           <div className="overflow-x-auto w-full">
              <table className="w-full text-left whitespace-nowrap table-auto block">
                <thead className="bg-[#020617] sticky top-0 z-10 hidden md:table-header-group">
                  <tr className="flex flex-col md:table-row">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">Description</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">Chq/Ref. No.</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#FF4D4D] uppercase tracking-widest border-b border-slate-800">Withdrawal (Dr.)</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#00FF41] uppercase tracking-widest border-b border-slate-800">Deposit (Cr.)</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">Balance</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-blue-400 uppercase tracking-widest border-b border-slate-800 bg-blue-900/10">Reason</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-purple-400 uppercase tracking-widest border-b border-slate-800 bg-purple-900/10">AI Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 block md:table-row-group w-full">
                  {parsedData.map((tx, idx) => (
                    <tr key={tx.transaction_id || idx} className="hover:bg-slate-800/30 transition-colors flex flex-col md:table-row p-4 md:p-0 border-b border-slate-800">
                      <td className="px-0 md:px-4 py-1 md:py-3 text-[10px] md:text-xs text-slate-300 font-mono align-top order-5 md:order-1">{tx.date}</td>
                      <td className="px-0 md:px-4 py-1 md:py-3 text-[10px] md:text-xs text-slate-400 font-mono w-full md:w-64 whitespace-normal break-words max-w-none md:max-w-[250px] align-top order-1 md:order-2">{tx.raw_description}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500 font-mono align-top md:order-3">{tx.transaction_id}</td>
                      
                      <div className="flex gap-4 md:table-cell px-0 md:px-4 py-1 md:py-3 font-mono font-black order-2 md:order-4">
                        <span className="text-[#FF4D4D]">{tx.withdrawal !== "0" ? `-${tx.withdrawal}` : ""}</span>
                        <span className="text-[#00FF41]">{tx.deposit !== "0" ? `+${tx.deposit}` : ""}</span>
                      </div>
                      <td className="hidden md:table-cell px-4 py-3 font-mono font-black text-[#00FF41] align-top">
                         {tx.deposit !== "0" ? tx.deposit : "-"}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 font-mono text-slate-500 text-xs align-top">{tx.balance}</td>
                      
                      <td className="px-0 md:px-4 py-2 md:py-3 bg-transparent md:bg-blue-900/5 align-top order-3 md:order-7">
                        <div className="flex items-center gap-2 group w-full">
                          <Edit2 size={12} className="text-blue-500 opacity-50 hidden md:block group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          <input 
                            type="text"
                            value={tx.reason}
                            onChange={(e) => handleReasonChange(idx, e.target.value)}
                            className="bg-[#020617] md:bg-transparent border border-slate-700 md:border-b md:border-transparent md:hover:border-slate-600 focus:border-blue-500 focus:outline-none text-white font-bold py-2 md:py-1 px-3 md:px-1 w-full transition-colors rounded-lg md:rounded-none text-[10px] md:text-xs min-h-[44px] md:min-h-0"
                            placeholder="Reason"
                          />
                        </div>
                      </td>
                      
                      <td className="px-0 md:px-4 py-2 md:py-3 bg-transparent md:bg-purple-900/5 align-top relative order-4 md:order-8">
                         <select 
                            value={tx.category || "Miscellaneous"}
                            onChange={(e) => handleCategoryChange(idx, e.target.value)}
                            className="w-full text-[10px] md:text-xs font-bold uppercase tracking-widest py-2 md:py-1 px-3 md:px-2 rounded-lg cursor-pointer appearance-none text-center bg-[#020617] bg-opacity-80 focus:outline-none transition-all shadow-lg border border-slate-700 hover:border-current inline-block min-h-[44px] md:min-h-0"
                            style={{ 
                               color: CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Miscellaneous"],
                               borderColor: `${CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Miscellaneous"]}50`
                            }}
                         >
                            {CATEGORY_OPTIONS.map(cat => (
                               <option key={cat} value={cat} className="bg-[#020617] font-bold text-white text-left tracking-widest uppercase text-[10px]">
                                   {cat}
                               </option>
                            ))}
                         </select>
                      </td>
                    </tr>
                  ))}
                  {parsedData.length === 0 && (
                     <tr>
                        <td colSpan={7} className="text-center p-8 text-slate-500 font-mono">No valid transactions extracted. Verify PDF format.</td>
                     </tr>
                  )}
                </tbody>
              </table>
           </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border p-8 rounded-2xl flex flex-col items-center justify-center text-center mt-4 glass shadow-2xl mx-4"
          style={{ backgroundColor: `${getAuraColor()}05`, borderColor: `${getAuraColor()}40` }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${getAuraColor()}20` }}>
             <CheckCircle size={32} style={{ color: getAuraColor() }} />
          </div>
          <h4 className="text-xl md:text-2xl font-black tracking-wide text-white uppercase mb-2">Resonance Achieved</h4>
          <p className="text-[10px] md:text-sm text-slate-400 max-w-sm mb-6">
            Supabase synchronization complete. Your Universal Ledger has been updated with {parsedData.length} records.
          </p>
          <button 
             onClick={() => {
               setFile(null);
               setParsedData([]);
               setStatus('idle');
             }}
             className="px-6 py-3 rounded-xl text-[10px] md:text-sm font-bold uppercase tracking-widest border transition-all w-full md:w-auto min-h-[44px]"
             style={{ borderColor: getAuraColor(), color: getAuraColor() }}
          >
            Upload Another
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Upload;
