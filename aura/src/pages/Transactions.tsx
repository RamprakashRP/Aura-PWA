import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Search, Sparkles, Edit2, Check, X, Share2, ChevronUp, ChevronDown, Filter, Calendar, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#00FF41",
  Transport: "#ADD8E6",
  Studies: "#FFD700",
  Shopping: "#FF4D4D",
  Wearables: "#00FFFF",
  Groceries: "#FF8C00",
  Entertainment: "#8A2BE2",
  Miscellaneous: "#4A4A4A"
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS);

const categorize = (desc: string) => {
  const d = desc.toLowerCase();
  if (["chicken", "meat", "grocery", "supermarket", "mart", "store", "d-mart", "reliance", "vegetable", "fruit", "milk", "dairy", "egg", "fish", "mutton"].some(k => d.includes(k))) return "Groceries";
  const foodKeywords = [
     "food", "zomato", "swiggy", "starbucks", "tim hortons", "tims", "restaurant", "kozhi",
     "dosa", "idli", "vada", "sambar", "chutney", "biryani", "meals", "parotta", "chapati", "poori", "pongal", "upma", "bisi bele bath", "payasam", "chicken 65", "thali", "uttapam", "appam", "paniyaram", "bonda", "bajji", "kebab", "shawarma", "mandi", "tandoori", "naan", "kulcha", "pulao", "fried rice", "noodles", "momo", "gobi", "paneer", "manchurian", "soup", "filter coffee", "chai",
     "poutine", "pizza", "burger", "fries", "subway", "mcdonalds", "kfc", "wendys", "taco", "burrito", "sushi", "ramen", "pho", "wings", "bagel", "croissant", "donut", "pastry", "cake", "bacon", "steak", "bbq", "wrap", "salad", "smoothie", "boba", "bubble tea", "cafe", "bakery", "kitchen"
  ];
  if (foodKeywords.some(k => d.includes(k))) return "Food";
  if (["uber", "ola", "metro", "oc transpo", "petrol", "shell", "transit", "presto", "cab"].some(k => d.includes(k))) return "Transport";
  if (["srm", "university", "coursera", "books", "ielts"].some(k => d.includes(k))) return "Studies";
  if (["amazon", "flipkart", "walmart", "myntra"].some(k => d.includes(k))) return "Shopping";
  if (["dress", "belt", "shirt", "pant", "shoe", "clothing", "apparel", "wear", "zara", "h&m", "uniqlo"].some(k => d.includes(k))) return "Wearables";
  if (["netflix", "valorant", "steam", "cinema"].some(k => d.includes(k))) return "Entertainment";
  return "Miscellaneous";
};

const Transactions = () => {
  const { user } = useAuth();
  const { getAuraColor } = useTheme();
  
  // Data State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Spreadsheet Controls
  type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  
  // Custom Right-Click Filter Menu State
  const [activeFilterMenu, setActiveFilterMenu] = useState<{ column: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', category: '' });

  useEffect(() => {
    fetchTransactions();
    
    // Click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveFilterMenu(null);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id);
    if (data) {
       const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
       setTransactions(sorted);
    }
    setLoading(false);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleContextMenu = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setActiveFilterMenu({ column, x: e.clientX, y: e.clientY });
  };

  const toggleFilter = (column: string, value: string) => {
    setFilters(prev => {
      const current = prev[column] || [];
      const updated = current.includes(value) 
         ? current.filter(v => v !== value) 
         : [...current, value];
      
      if (updated.length === 0) {
         const { [column]: _, ...rest } = prev;
         return rest;
      }
      return { ...prev, [column]: updated };
    });
  };

  const clearFilters = (column: string) => {
    setFilters(prev => {
      const { [column]: _, ...rest } = prev;
      return rest;
    });
    setActiveFilterMenu(null);
  };

  const processedData = useMemo(() => {
    let result = [...transactions];

    if (timeRange !== 'ALL' && timeRange !== 'CUSTOM' && result.length > 0) {
      const latestEpoch = Math.max(...result.map(t => new Date(t.date).getTime()));
      const multiplier = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
      const windowMs = multiplier * 30 * 24 * 60 * 60 * 1000;
      result = result.filter(t => new Date(t.date).getTime() >= (latestEpoch - windowMs));
    } else if (timeRange === 'CUSTOM') {
      if (customDateFrom) {
         const fromTime = new Date(customDateFrom + "T00:00:00").getTime();
         result = result.filter(t => new Date(t.date).getTime() >= fromTime);
      }
      if (customDateTo) {
         const toTime = new Date(customDateTo + "T23:59:59").getTime();
         result = result.filter(t => new Date(t.date).getTime() <= toTime);
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q) ||
        t.transaction_id.toLowerCase().includes(q)
      );
    }

    Object.entries(filters).forEach(([col, activeValues]) => {
      if (activeValues.length > 0) {
        result = result.filter(t => activeValues.includes(String(t[col])));
      }
    });

    if (sortConfig !== null) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'date') {
           valA = new Date(a.date).getTime();
           valB = new Date(b.date).getTime();
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [transactions, timeRange, customDateFrom, customDateTo, searchQuery, filters, sortConfig]);

  // Grouped Mobile Sticky Segments
  const groupedData = useMemo(() => {
    const groups: { month: string, txs: any[] }[] = [];
    processedData.forEach(tx => {
       const dateObj = new Date(tx.date);
       const monthStr = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
       let group = groups.find(g => g.month === monthStr);
       if (!group) {
          group = { month: monthStr, txs: [] };
          groups.push(group);
       }
       group.txs.push(tx);
    });
    return groups;
  }, [processedData]);

  const getUniqueValues = (column: string) => {
    const rawSet = new Set(transactions.map(t => String(t[column])));
    return Array.from(rawSet).sort();
  };

  const handleEditClick = (tx: any) => {
    setEditingId(tx.transaction_id);
    const instantCategory = categorize(tx.description);
    setEditForm({ description: tx.description, category: instantCategory });
  };

  const handleSaveEdit = async (tx: any) => {
    setTransactions(transactions.map(t => 
       t.transaction_id === tx.transaction_id ? { ...t, description: editForm.description, category: editForm.category } : t
    ));
    setEditingId(null);
    await supabase.from('transactions')
      .update({ description: editForm.description, category: editForm.category })
      .eq('transaction_id', tx.transaction_id)
      .eq('user_id', user?.id);
  };

  const toggleVisibility = async (id: string, currentVisibility: string) => {
    if (!user) return;
    const newVis = currentVisibility === 'Private' ? 'Shared' : 'Private';
    const { error } = await supabase.from('transactions')
      .update({ visibility: newVis })
      .eq('transaction_id', id)
      .eq('user_id', user.id);
    if (!error) setTransactions(transactions.map(t => t.transaction_id === id ? { ...t, visibility: newVis } : t));
  };
  
  const handleDeleteTx = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to completely erase this record?")) {
       setTransactions(transactions.filter(t => t.transaction_id !== id));
       await supabase.from('transactions')
         .delete()
         .eq('transaction_id', id)
         .eq('user_id', user?.id);
       setEditingId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* FILTER OVERLAY POPUP */}
      <AnimatePresence>
        {activeFilterMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            ref={menuRef}
            style={{ top: activeFilterMenu.y + 15, left: activeFilterMenu.x }}
            className="fixed z-50 w-64 glass bg-[#020617] border border-slate-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-3xl"
            onContextMenu={(e) => e.preventDefault()}
          >
             <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter: {activeFilterMenu.column}</span>
                <button onClick={() => clearFilters(activeFilterMenu.column)} className="text-[10px] text-blue-400 font-bold hover:text-white transition-colors uppercase">Clear</button>
             </div>
             <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {getUniqueValues(activeFilterMenu.column).map(val => (
                   <label key={val} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800/50 rounded cursor-pointer transition-colors group">
                      <input 
                         type="checkbox" 
                         checked={(filters[activeFilterMenu.column] || []).includes(val)}
                         onChange={() => toggleFilter(activeFilterMenu.column, val)}
                         className="rounded border-slate-600 bg-transparent text-blue-500 focus:ring-blue-500/20"
                         style={{ accentColor: getAuraColor() }}
                      />
                      <span className="text-xs text-slate-300 font-medium group-hover:text-white truncate" title={val}>{val}</span>
                   </label>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 md:mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-2 md:gap-3">
             Ledger <span style={{ color: getAuraColor() }}>Archive</span>
          </h1>
          <p className="text-[8px] md:text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">
            Viewing {processedData.length} records • Context-click headers to filter
          </p>
        </div>
        
        {/* ADVANCED SPREADSHEET UI CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          
          <div className="relative flex-1 md:flex-none" ref={timeDropdownRef}>
             <button 
                onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                className="w-full flex justify-between md:justify-start items-center gap-2 px-3 py-2 rounded-lg bg-[#0a0f1a] border border-slate-800 text-[10px] font-black tracking-widest uppercase hover:border-slate-600 transition-all text-white shadow-lg"
             >
                <div className="flex items-center gap-2">
                   <Calendar size={12} style={{ color: getAuraColor() }} /> 
                   {timeRange === 'CUSTOM' ? 'Custom Bounds' : timeRange === 'ALL' ? 'All Time' : timeRange}
                </div>
                <ChevronDown size={12} className="opacity-50" />
             </button>
             
             <AnimatePresence>
               {showTimeDropdown && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: -10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: -10 }}
                   className="absolute top-full left-0 md:auto md:right-0 mt-2 w-full md:w-40 glass bg-[#020617] border border-slate-700 rounded-lg shadow-2xl z-40 overflow-hidden"
                 >
                    {['1M', '3M', '6M', '1Y', 'ALL', 'CUSTOM'].map(opt => (
                       <button
                          key={opt}
                          onClick={() => { setTimeRange(opt as TimeRange); setShowTimeDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase hover:bg-slate-800 transition-colors ${timeRange === opt ? 'bg-slate-800/80 text-white' : 'text-slate-400'}`}
                          style={timeRange === opt ? { color: getAuraColor() } : {}}
                       >
                          {opt === 'CUSTOM' ? 'Custom Range' : opt === 'ALL' ? 'All Time' : opt}
                       </button>
                    ))}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
          
          {/* CUSTOM RANGE INPUTS */}
          {timeRange === 'CUSTOM' && (
             <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex-1 md:flex-none flex items-center justify-between md:justify-start gap-1 md:gap-2 bg-[#0a0f1a] rounded-lg p-1 border border-slate-800 shadow-lg"
             >
                <input 
                   type="date" 
                   value={customDateFrom} 
                   onChange={e => setCustomDateFrom(e.target.value)} 
                   className="w-full bg-transparent text-[9px] md:text-[10px] font-mono text-slate-300 px-1 md:px-2 py-1 outline-none" 
                   style={{ colorScheme: 'dark' }} 
                />
                <span className="text-slate-600">-</span>
                <input 
                   type="date" 
                   value={customDateTo} 
                   onChange={e => setCustomDateTo(e.target.value)} 
                   className="w-full bg-transparent text-[9px] md:text-[10px] font-mono text-slate-300 px-1 md:px-2 py-1 outline-none" 
                   style={{ colorScheme: 'dark' }} 
                />
             </motion.div>
          )}

          <div className="relative w-full md:w-auto mt-2 md:mt-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0a0f1a] border border-slate-800 rounded-lg text-xs text-white focus:outline-none transition-colors md:w-48"
              style={{ '--tw-ring-color': getAuraColor() } as any}
            />
          </div>
          
        </div>
      </header>

      {/* MOBILE TRASACTION CARDS (Visible only < 768px) */}
      <div className="md:hidden space-y-4 pb-20">
         {processedData.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-mono text-xs">No records match the current filter matrix.</div>
         ) : (
            groupedData.map(group => (
               <div key={group.month} className="space-y-3">
                  <div className="sticky top-0 z-10 bg-[#020617]/90 backdrop-blur-md py-2 border-b border-slate-800">
                     <h3 className="text-[10px] font-black uppercase tracking-widest px-2" style={{ color: getAuraColor() }}>{group.month}</h3>
                  </div>
                  <div className="space-y-3 px-1">
                     {group.txs.map(tx => {
                        const isEditing = editingId === tx.transaction_id;
                        const isDeposit = tx.amount > 0;
                        const amountColor = isDeposit ? "#00FF41" : "#FF4D4D";
                        const prefix = isDeposit ? "+" : "-";
                        const absAmount = Math.abs(tx.amount).toFixed(2);
                        const categoryDisplayColor = CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Miscellaneous"];
                        
                        return (
                           <div 
                              key={tx.transaction_id}
                              onClick={() => { if (!isEditing) handleEditClick(tx); }}
                              className={`p-4 rounded-xl transition-all ${isEditing ? 'bg-slate-900 border border-slate-600 shadow-2xl scale-[1.02]' : 'bg-[#0a0f1a] border border-slate-800/80 active:scale-[0.98]'}`}
                           >
                              {/* Top Row: Reason and Amount */}
                              <div className="flex justify-between items-start mb-3 gap-4">
                                 {isEditing ? (
                                    <input 
                                      type="text"
                                      value={editForm.description}
                                      onChange={(e) => {
                                         const newDesc = e.target.value;
                                         setEditForm({...editForm, description: newDesc, category: categorize(newDesc)});
                                      }}
                                      className="flex-1 w-full min-w-0 bg-[#020617] border border-slate-700 text-white font-bold py-1.5 px-2 rounded focus:outline-none text-sm"
                                      style={{ borderColor: getAuraColor() }}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="Entity Description"
                                    />
                                 ) : (
                                    <span className="font-bold text-sm text-white truncate flex-1 leading-tight">{tx.description}</span>
                                 )}
                                 <span className="font-mono text-base font-black flex-shrink-0" style={{ color: amountColor }}>
                                    {prefix}{absAmount} <span className="text-[10px] opacity-60 ml-0.5">{tx.currency}</span>
                                 </span>
                              </div>
                              
                              {/* Middle Row: Category and ID */}
                              <div className="flex justify-between items-center mb-3">
                                 {isEditing ? (
                                    <select 
                                       value={editForm.category}
                                       onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                       className="text-[10px] font-bold uppercase tracking-widest py-1.5 px-2 rounded appearance-none bg-[#020617] focus:outline-none border border-slate-700"
                                       style={{ color: CATEGORY_COLORS[editForm.category] || CATEGORY_COLORS["Miscellaneous"] }}
                                       onClick={e => e.stopPropagation()}
                                    >
                                       {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                 ) : (
                                    <div 
                                       className="px-2 py-0.5 rounded-sm text-[9px] font-black tracking-widest uppercase border"
                                       style={{ 
                                          color: categoryDisplayColor,
                                          backgroundColor: `${categoryDisplayColor}15`,
                                          borderColor: `${categoryDisplayColor}30`
                                       }}
                                    >
                                       {tx.category || 'Miscellaneous'}
                                    </div>
                                 )}
                                 <span className="text-[9px] text-slate-500 font-mono truncate max-w-[120px]">{tx.transaction_id.split('-')[0]}•••</span>
                              </div>
                              
                              {/* Bottom Row / Floating Action Deck */}
                              <div className="flex justify-between items-end mt-1">
                                 <span className="text-[10px] text-slate-400 font-mono">{tx.date}</span>
                                 
                                 {isEditing && (
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                       <button onClick={(e) => handleDeleteTx(e, tx.transaction_id)} className="p-2 rounded-lg bg-[#FF0000] text-black font-black active:scale-95 transition-transform"><Trash2 size={14}/></button>
                                       <button onClick={(e) => { e.stopPropagation(); toggleVisibility(tx.transaction_id, tx.visibility); }} className="p-2 rounded-lg border border-slate-700 active:scale-95 transition-transform bg-[#020617]" style={{ color: tx.visibility === 'Shared' ? getAuraColor() : '#4A4A4A' }}>
                                          {tx.visibility === 'Private' ? <EyeOff size={14}/> : <Eye size={14}/>}
                                       </button>
                                       <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-2 rounded-lg border border-slate-700 text-slate-400 active:scale-95 transition-transform bg-[#020617]"><X size={14}/></button>
                                       <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(tx); }} className="px-4 py-2 rounded-lg bg-[#00FF41] text-black font-black uppercase text-[10px] active:scale-95 transition-transform flex items-center gap-1"><Check size={14}/> Save</button>
                                    </div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            ))
         )}
      </div>

      {/* DESKTOP SPREADSHEET (Visible only >= 768px) */}
      <div className="hidden md:block glass rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto min-h-[60vh]">
          <table className="w-full text-left whitespace-nowrap table-auto border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#020617] bg-opacity-80 select-none">
                
                {[
                  { key: 'date', label: 'Date / Ref', align: 'left', width: 'w-48' },
                  { key: 'description', label: 'Entity', align: 'left', width: 'w-1/3' },
                  { key: 'category', label: 'Category', align: 'center', width: 'w-40' },
                  { key: 'amount', label: 'Amount', align: 'right', width: 'w-32' },
                  { key: 'visibility', label: 'Privacy', align: 'center', width: 'w-32' }
                ].map(col => (
                  <th 
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    onContextMenu={(e) => handleContextMenu(e, col.key)}
                    className={`px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800/50 transition-colors text-${col.align} ${col.width} group`}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      {filters[col.key] && filters[col.key].length > 0 && <Filter size={10} className="text-blue-400 mr-1" />}
                      <span className="group-hover:text-white transition-colors">{col.label}</span>
                      {sortConfig?.key === col.key ? (
                         sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-white" /> : <ChevronDown size={12} className="text-white" />
                      ) : (
                         <ChevronUp size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                      )}
                    </div>
                  </th>
                ))}
                
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800/50">
              {processedData.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="text-center py-24 text-slate-500 font-mono text-sm">
                       No records match the current filter matrix.
                    </td>
                 </tr>
              ) : (
                processedData.map((tx) => {
                  const isVoid = tx.visibility === 'Private';
                  const isEditing = editingId === tx.transaction_id;
                  const rowStyles = isVoid ? { backgroundColor: '#0a0f1a' } : {};
                  
                  const isDeposit = tx.amount > 0;
                  const amountColor = isDeposit ? "#00FF41" : "#FF4D4D";
                  const prefix = isDeposit ? "+" : "-";
                  const absAmount = Math.abs(tx.amount).toFixed(2);
                  const categoryDisplayColor = CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Miscellaneous"];

                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-800/30 transition-colors group" style={rowStyles}>
                      <td className="px-6 py-4 w-48 align-top">
                         <div className="text-sm tracking-wide font-mono text-slate-200">{tx.date}</div>
                         <div className="text-[10px] text-slate-500 font-mono mt-1 opacity-60 uppercase">{tx.transaction_id}</div>
                      </td>
                      
                      <td className="px-6 py-4 align-top w-1/3 min-w-[250px]">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editForm.description}
                            onChange={(e) => {
                               const newDesc = e.target.value;
                               setEditForm({...editForm, description: newDesc, category: categorize(newDesc)});
                            }}
                            className="w-full bg-[#020617] border border-slate-700 text-white font-bold py-1.5 px-3 rounded focus:outline-none transition-all"
                            style={{ borderColor: getAuraColor() }}
                            autoFocus
                          />
                        ) : (
                          <div className="font-medium whitespace-normal break-words" style={{ color: isVoid ? '#64748b' : '#ffffff' }}>
                             {tx.description}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 align-top text-center w-40">
                         {isEditing ? (
                            <select 
                               value={editForm.category}
                               onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                               className="w-full text-xs font-bold uppercase tracking-widest py-1.5 px-2 rounded cursor-pointer appearance-none text-center bg-[#020617] focus:outline-none transition-all border border-slate-700 hover:border-current inline-block"
                               style={{ borderColor: getAuraColor(), color: CATEGORY_COLORS[editForm.category] || CATEGORY_COLORS["Miscellaneous"] }}
                            >
                               {CATEGORY_OPTIONS.map(cat => (
                                  <option key={cat} value={cat} className="bg-[#020617] font-bold text-white text-left tracking-widest uppercase text-[10px]">
                                      {cat}
                                  </option>
                               ))}
                            </select>
                         ) : (
                            <div 
                               className="inline-block px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase border border-transparent shadow-lg"
                               style={{ 
                                  color: isVoid ? '#4A4A4A' : categoryDisplayColor,
                                  backgroundColor: isVoid ? '#111' : `${categoryDisplayColor}15`,
                                  borderColor: isVoid ? '#333' : `${categoryDisplayColor}30`
                               }}
                            >
                               {tx.category || 'Miscellaneous'}
                            </div>
                         )}
                      </td>
                      
                      <td className="px-6 py-4 font-mono font-black text-right text-base align-top w-32" style={{ color: isVoid ? '#4A4A4A' : amountColor }}>
                        {prefix}{absAmount} <span className="text-[10px] font-normal opacity-50 ml-1">{tx.currency}</span>
                      </td>
                      
                      <td className="px-6 py-4 flex justify-center align-top w-32">
                        <button 
                          onClick={() => toggleVisibility(tx.transaction_id, tx.visibility)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all"
                          style={tx.visibility === 'Shared' ? {
                            backgroundColor: `${getAuraColor()}10`,
                            borderColor: `${getAuraColor()}40`,
                            borderWidth: '1px', color: getAuraColor()
                          } : {
                            backgroundColor: '#050505', borderColor: '#334155', borderWidth: '1px', color: '#4A4A4A'
                          }}
                        >
                          {tx.visibility === 'Private' ? <EyeOff size={12} /> : <Eye size={12} />}
                          {tx.visibility}
                        </button>
                      </td>
                      
                      <td className="px-6 py-4 text-center align-top w-24">
                         {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                               <button onClick={(e) => handleDeleteTx(e, tx.transaction_id)} className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                               <button onClick={() => handleSaveEdit(tx)} className="p-1.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors" title="Save Changes"><Check size={16} /></button>
                               <button onClick={() => setEditingId(null)} className="p-1.5 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 transition-colors" title="Cancel"><X size={16} /></button>
                            </div>
                         ) : (
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditClick(tx)} className="p-1.5 rounded text-slate-500 hover:text-white transition-colors" title="Edit Record"><Edit2 size={16} /></button>
                                <button onClick={() => alert(`Share settings (View/Edit) for ${tx.description} will be integrated soon!`)} className="p-1.5 rounded text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" title="Share Record"><Share2 size={16} /></button>
                            </div>
                         )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
