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
            body: JSON.stringify({ pdfBase64: base64 }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          
          setParsedData(data);
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
    const { error } = await supabase.from('transactions').delete().not('transaction_id', 'is', null);
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
    <div className="max-w-[95%] lg:max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Awaken <span style={{ color: getAuraColor() }}>Aura</span></h1>
          <p className="text-slate-400 mt-2 font-mono text-sm uppercase">Smart ML-Lite Categorization Engine</p>
        </div>
        <button 
           onClick={wipeDatabase}
           className="flex items-center gap-2 px-4 py-2 border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
        >
           <Trash2 size={14} /> Wipe All Records (Clean Slate)
        </button>
      </header>

      {status === 'idle' || status === 'processing' ? (
        <>
          <motion.div 
            animate={dragActive ? { boxShadow: getAuraGlow(), borderColor: getAuraColor() } : { borderColor: '#334155' }}
            className="glass p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all bg-[#0a0f1a]"
            style={{ backgroundColor: dragActive ? `${getAuraColor()}05` : undefined }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 shadow-xl border border-slate-800">
              <UploadIcon size={32} style={{ color: getAuraColor() }} className={dragActive ? 'animate-bounce' : 'opacity-80'} />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">
              Inject Statement Data
            </h3>
            <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">
              Upload PDF exports (Kotak format supported). Neural engine maps UPI/Merchant/Note directly.
            </p>

            <label 
               className="cursor-pointer bg-[#0a0f1a] border hover:bg-slate-900 border-slate-700 text-white font-bold py-3 px-6 rounded-lg tracking-widest uppercase transition-colors flex items-center gap-3"
               style={dragActive ? { borderColor: getAuraColor() } : {}}
            >
              <FileJson size={18} style={{ color: getAuraColor() }} />
              Select Node
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

          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-6 rounded-2xl border-l-4 flex flex-col md:flex-row items-center justify-between gap-4"
              style={{ borderLeftColor: getAuraColor() }}
            >
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target Payload</p>
                <p className="text-white font-mono">{file.name} <span className="text-slate-500 text-xs ml-2">({(file.size / 1024).toFixed(1)} KB)</span></p>
              </div>
              
              <button 
                onClick={handleProcess}
                disabled={status !== 'idle'}
                className="rounded-lg px-6 py-3 font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 border"
                style={{ 
                  backgroundColor: `${getAuraColor()}20`, 
                  color: getAuraColor(),
                  borderColor: `${getAuraColor()}40`,
                  boxShadow: status === 'idle' ? getAuraGlow() : 'none'
                }}
              >
                {status === 'idle' && 'Execute Neural Parse'}
                {status === 'processing' && <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: getAuraColor(), borderTopColor: 'transparent' }}></div> Extracting...</span>}
              </button>
            </motion.div>
          )}
        </>
      ) : status === 'review' || status === 'importing' ? (
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="glass rounded-2xl border overflow-hidden"
           style={{ borderColor: `${getAuraColor()}30`, boxShadow: getAuraGlow() }}
        >
           <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a0f1a] flex-wrap gap-4">
             <div>
               <h3 className="text-xl font-black text-white uppercase tracking-widest">Review Kotak Imports</h3>
               <p className="text-xs text-slate-500 font-mono mt-1">Found {parsedData.length} authentic records. Verify Full Ledger mapping.</p>
             </div>
             
             <div className="flex items-center gap-6">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Native Currency</span>
                  <select 
                     value={statementCurrency}
                     onChange={(e) => setStatementCurrency(e.target.value)}
                     className="bg-[#020617] text-white text-xs font-bold uppercase tracking-widest border border-slate-700 rounded px-3 py-1.5 focus:outline-none cursor-pointer transition-colors"
                     style={{ borderColor: getAuraColor(), color: getAuraColor() }}
                  >
                     {['INR', 'CAD', 'USD', 'EUR', 'GBP'].map(c => <option key={c} value={c} className="bg-[#020617] text-white">{c}</option>)}
                  </select>
               </div>
               
               <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmImport}
                  disabled={status === 'importing' || parsedData.length === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: getAuraColor(), boxShadow: `0 0 15px ${getAuraColor()}80` }}
                >
                  {status === 'importing' ? (
                     <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Syncing...</span>
                  ) : (
                     <><Play size={16} fill="white" /> Confirm & Import</>
                  )}
                </motion.button>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap table-auto">
                <thead className="bg-[#020617]">
                  <tr>
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
                <tbody className="divide-y divide-slate-800/50">
                  {parsedData.map((tx, idx) => (
                    <tr key={tx.transaction_id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-300 font-mono align-top">{tx.date}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono w-64 whitespace-normal break-words max-w-[250px] align-top">{tx.raw_description}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono align-top">{tx.transaction_id}</td>
                      <td className="px-4 py-3 font-mono font-black text-[#FF4D4D] align-top">
                        {tx.withdrawal !== "0" ? tx.withdrawal : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-[#00FF41] align-top">
                         {tx.deposit !== "0" ? tx.deposit : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs align-top">{tx.balance}</td>
                      
                      <td className="px-4 py-3 bg-blue-900/5 align-top">
                        <div className="flex items-center gap-2 group">
                          <Edit2 size={12} className="text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          <input 
                            type="text"
                            value={tx.reason}
                            onChange={(e) => handleReasonChange(idx, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none text-white font-bold py-1 px-1 w-full transition-colors"
                          />
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 bg-purple-900/5 align-top relative">
                         <select 
                            value={tx.category || "Miscellaneous"}
                            onChange={(e) => handleCategoryChange(idx, e.target.value)}
                            className="text-xs font-bold uppercase tracking-widest py-1 px-2 rounded cursor-pointer appearance-none text-center bg-[#020617] bg-opacity-80 focus:outline-none transition-all shadow-lg border border-slate-700 hover:border-current inline-block"
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
          className="border p-8 rounded-2xl flex flex-col items-center justify-center text-center mt-4 glass shadow-2xl"
          style={{ backgroundColor: `${getAuraColor()}05`, borderColor: `${getAuraColor()}40` }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${getAuraColor()}20` }}>
             <CheckCircle size={32} style={{ color: getAuraColor() }} />
          </div>
          <h4 className="text-2xl font-black tracking-wide text-white uppercase mb-2">Resonance Achieved</h4>
          <p className="text-slate-400 max-w-sm mb-6">
            Supabase synchronization complete. Your Universal Ledger has been updated with {parsedData.length} records.
          </p>
          <button 
             onClick={() => {
               setFile(null);
               setParsedData([]);
               setStatus('idle');
             }}
             className="px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-widest border transition-all"
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
