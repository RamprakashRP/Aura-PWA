import { SmartTransactionAnnotator } from '../components/expenses/SmartTransactionAnnotator';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Eye, 
  EyeOff, 
  Search, 
  Edit2, 
  Check, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Calendar, 
  Trash2, 
  Landmark
} from 'lucide-react';
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

export interface ConnectedAccount {
  id: string;
  bank_id?: string;
  account_name: string;
  account_type?: string;
  last_4_digits?: string;
  balance?: number;
  currency?: string;
}

const categorize = (desc: string) => {
  const d = desc.toLowerCase();
  if (["chicken", "meat", "grocery", "supermarket", "mart", "store", "d-mart", "reliance", "vegetable", "fruit", "milk", "dairy", "egg", "fish", "mutton", "dollarama", "costco", "walmart", "loblaws", "metro", "sobeys", "no frills", "freshco"].some(k => d.includes(k))) return "Groceries";
  const foodKeywords = [
     "food", "starbucks", "tim hortons", "tims", "restaurant", "mcdonald", "subway", "chipotle", "cafe", "coffee", "pizza", "burger", "sushi", "dining", "bakery", "kebab", "shawarma"
  ];
  if (foodKeywords.some(k => d.includes(k))) return "Food";
  if (["uber", "lyft", "metro", "transit", "presto", "ttc", "gas", "esso", "petro", "shell"].some(k => d.includes(k))) return "Transport";
  if (["amazon", "shoppers", "winners", "best buy", "apple", "mall", "clothing", "zara", "h&m", "uniqlo"].some(k => d.includes(k))) return "Shopping";
  if (["netflix", "spotify", "cinema", "cineplex", "lcbo", "pub", "bar"].some(k => d.includes(k))) return "Entertainment";
  return "Miscellaneous";
};

const Transactions = () => {
  const { user } = useAuth();
  const { getAuraColor } = useTheme();
  
  // Data State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  
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
  
  // Connected Accounts Filter State
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  
  // Custom Right-Click Filter Menu State
  const [activeFilterMenu, setActiveFilterMenu] = useState<{ column: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', category: '' });

  useEffect(() => {
    fetchTransactions();
    fetchConnectedAccounts();
    
    // Click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveFilterMenu(null);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  // Fetch Connected Accounts from Supabase + Local Storage + Transactions discovery
  const fetchConnectedAccounts = async () => {
    if (!user) return;
    const accountsMap = new Map<string, ConnectedAccount>();

    // 1. Fetch from Supabase bank_accounts
    try {
      const { data: dbAccounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (dbAccounts) {
        dbAccounts.forEach((acc: any) => {
          accountsMap.set(acc.id, {
            id: acc.id,
            bank_id: acc.bank_id || 'cibc',
            account_name: acc.account_name || 'Bank Account',
            account_type: acc.account_type || 'Checking Account',
            last_4_digits: acc.last_4_digits || '',
            balance: acc.balance || 0,
            currency: acc.currency || 'CAD',
          });
        });
      }
    } catch (err) {
      console.warn('Could not query Supabase bank_accounts:', err);
    }

    // 2. Fetch from LocalStorage fallback
    try {
      const localKey = `aura_bank_accounts_${user.id}`;
      const localRaw = localStorage.getItem(localKey);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        parsed.forEach((acc: any) => {
          if (!accountsMap.has(acc.id)) {
            accountsMap.set(acc.id, {
              id: acc.id,
              bank_id: acc.bankId || acc.bank_id || 'cibc',
              account_name: acc.accountName || acc.account_name || 'Bank Account',
              account_type: acc.accountType || acc.account_type || 'Chequing',
              last_4_digits: acc.last4Digits || acc.last_4_digits || '',
              balance: acc.balance || 0,
              currency: acc.currency || 'CAD',
            });
          }
        });
      }
    } catch (e) {}

    // 3. Fallback: Auto-add user's connected CIBC account if not explicitly logged yet
    if (accountsMap.size === 0) {
      accountsMap.set('acc_cibc_chequing', {
        id: 'acc_cibc_chequing',
        bank_id: 'cibc',
        account_name: 'CIBC Chequing Account',
        account_type: 'Chequing',
        last_4_digits: '8840',
        balance: 0,
        currency: 'CAD',
      });
    }

    setConnectedAccounts(Array.from(accountsMap.values()));
  };

  const fetchTransactions = async () => {
    if (!user) return;
    
    // 1. Fetch from Supabase
    const { data: dbData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    let allTxs = dbData ? [...dbData] : [];

    // 2. Fallback check for any real-time webhook transactions in the server queue
    try {
      const res = await fetch(`/api/transactions/realtime?user_id=${user.id}`);
      if (res.ok) {
        const { transactions: queueTxs } = await res.json();
        if (queueTxs && queueTxs.length > 0) {
          for (const qTx of queueTxs) {
            const exists = allTxs.some(
              t => Math.abs(Number(t.amount) - Number(qTx.amount)) < 0.001 &&
                   t.date === qTx.date &&
                   t.description === qTx.description
            );
            if (!exists) {
              const cleanInsert = {
                user_id: user.id,
                amount: Number(qTx.amount),
                date: qTx.date || new Date().toISOString().split('T')[0],
                description: qTx.description,
                category: qTx.category || 'Miscellaneous',
                visibility: 'Private',
                currency: qTx.currency || 'CAD',
              };
              const { data: inserted } = await supabase.from('transactions').insert(cleanInsert).select().single();
              if (inserted) {
                allTxs.unshift(inserted);
              } else {
                allTxs.unshift({ ...cleanInsert, id: 'temp_' + Date.now() });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Fallback realtime sync check skipped:', e);
    }

    const sorted = allTxs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(sorted);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
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

  // Helper to match transaction with a connected account
  const matchTxToAccount = (tx: any, acc: ConnectedAccount) => {
    const desc = (tx.description || '').toLowerCase();
    const bank = (tx.bank || '').toLowerCase();
    const last4 = acc.last_4_digits || '';
    const accName = acc.account_name.toLowerCase();
    const bankId = (acc.bank_id || '').toLowerCase();

    if (tx.account_id && tx.account_id === acc.id) return true;
    if (last4 && desc.includes(last4)) return true;
    if (bankId && (desc.includes(bankId) || bank.includes(bankId))) return true;
    if (accName && desc.includes(accName)) return true;

    return false;
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
        (t.description || '').toLowerCase().includes(q) || 
        (t.category || '').toLowerCase().includes(q) ||
        (t.transaction_id || '').toLowerCase().includes(q)
      );
    }

    Object.entries(filters).forEach(([col, activeValues]) => {
      if (activeValues.length > 0) {
        result = result.filter(t => activeValues.includes(String(t[col])));
      }
    });

    // Connected Accounts Filter
    if (selectedAccountIds.length > 0) {
      const targetAccounts = connectedAccounts.filter(a => selectedAccountIds.includes(a.id));
      result = result.filter(t => {
        return targetAccounts.some(acc => matchTxToAccount(t, acc));
      });
    }

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
  }, [transactions, timeRange, customDateFrom, customDateTo, searchQuery, filters, sortConfig, selectedAccountIds, connectedAccounts]);

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
    return Array.from(new Set(transactions.map(t => String(t[column] || '')))).filter(Boolean);
  };

  const handleEditClick = (tx: any) => {
    setEditingId(tx.id || tx.transaction_id);
    const instantCategory = tx.category || categorize(tx.description);
    setEditForm({ description: tx.description, category: instantCategory });
  };

  const handleSaveEdit = async (tx: any) => {
    const txId = tx.id || tx.transaction_id;
    setTransactions(transactions.map(t => 
       (t.id === txId || t.transaction_id === txId) ? { ...t, description: editForm.description, category: editForm.category } : t
    ));
    setEditingId(null);
    await supabase.from('transactions')
      .update({ description: editForm.description, category: editForm.category })
      .eq('id', txId)
      .eq('user_id', user?.id);
  };

  const toggleVisibility = async (id: string, currentVisibility: string) => {
    if (!user) return;
    const newVis = currentVisibility === 'Private' ? 'Shared' : 'Private';
    const { error } = await supabase.from('transactions')
      .update({ visibility: newVis })
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) setTransactions(transactions.map(t => (t.id === id || t.transaction_id === id) ? { ...t, visibility: newVis } : t));
  };
  
  const handleDeleteTx = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to completely erase this record?")) {
       setTransactions(transactions.filter(t => t.id !== id && t.transaction_id !== id));
       await supabase.from('transactions')
         .delete()
         .eq('id', id)
         .eq('user_id', user?.id);
       setEditingId(null);
    }
  };

  const selectedAccountLabels = useMemo(() => {
    if (selectedAccountIds.length === 0) return 'All Accounts';
    if (selectedAccountIds.length === 1) {
      const found = connectedAccounts.find(a => a.id === selectedAccountIds[0]);
      return found ? `${found.account_name} ${found.last_4_digits ? `(${found.last_4_digits})` : ''}` : '1 Account';
    }
    return `${selectedAccountIds.length} Accounts`;
  }, [selectedAccountIds, connectedAccounts]);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Real-Time Transaction Annotator Prompt */}
      <SmartTransactionAnnotator />
      
      {/* FILTER OVERLAY POPUP */}
      <AnimatePresence>
        {activeFilterMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            ref={menuRef}
            style={{ top: activeFilterMenu.y + 15, left: activeFilterMenu.x }}
            className="fixed z-50 w-64 glass bg-[#000000] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-3xl"
            onContextMenu={(e) => e.preventDefault()}
          >
             <div className="bg-[#080808]/90 px-4 py-3 border-b border-zinc-700 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Filter: {activeFilterMenu.column}</span>
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
                      <span className="text-xs font-mono text-zinc-300 group-hover:text-white transition-colors">{val}</span>
                   </label>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SPREADSHEET TOOLBAR */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#000000] border border-zinc-800 p-3 md:p-4 rounded-xl shadow-2xl">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <h1 className="text-lg md:text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <span>Unified Ledger</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-zinc-400">
               {processedData.length} records
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          {/* TIME RANGE SELECTOR */}
          <div className="relative flex-1 md:flex-none" ref={timeDropdownRef}>
             <button 
                onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                className="w-full flex justify-between md:justify-start items-center gap-2 px-3 py-2 rounded-lg bg-[#080808] border border-zinc-800 text-[10px] font-black tracking-widest uppercase hover:border-slate-600 transition-all text-white shadow-lg cursor-pointer"
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
                   className="absolute top-full left-0 md:auto md:right-0 mt-2 w-full md:w-40 glass bg-[#000000] border border-zinc-700 rounded-lg shadow-2xl z-40 overflow-hidden"
                 >
                    {['1M', '3M', '6M', '1Y', 'ALL', 'CUSTOM'].map(opt => (
                       <button
                          key={opt}
                          onClick={() => { setTimeRange(opt as TimeRange); setShowTimeDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase hover:bg-slate-800 transition-colors cursor-pointer ${timeRange === opt ? 'bg-slate-800/80 text-white' : 'text-zinc-400'}`}
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
               className="flex-1 md:flex-none flex items-center justify-between md:justify-start gap-1 md:gap-2 bg-[#080808] rounded-lg p-1 border border-zinc-800 shadow-lg"
             >
                <input 
                   type="date" 
                   value={customDateFrom} 
                   onChange={e => setCustomDateFrom(e.target.value)} 
                   className="w-full bg-transparent text-[9px] md:text-[10px] font-mono text-zinc-300 px-1 md:px-2 py-1 outline-none" 
                   style={{ colorScheme: 'dark' }} 
                />
                <span className="text-slate-600">-</span>
                <input 
                   type="date" 
                   value={customDateTo} 
                   onChange={e => setCustomDateTo(e.target.value)} 
                   className="w-full bg-transparent text-[9px] md:text-[10px] font-mono text-zinc-300 px-1 md:px-2 py-1 outline-none" 
                   style={{ colorScheme: 'dark' }} 
                />
             </motion.div>
          )}

          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-auto mt-2 md:mt-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none transition-all md:w-48 hover:border-slate-600"
            />
          </div>

          {/* DYNAMIC USER CONNECTED ACCOUNTS FILTER */}
          <div className="relative flex-1 md:flex-none" ref={accountDropdownRef}>
             <button 
                type="button"
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="w-full flex justify-between md:justify-start items-center gap-2 px-3 py-2 rounded-lg bg-[#080808] border border-zinc-800 text-[10px] font-black tracking-widest uppercase hover:border-slate-600 transition-all text-white shadow-lg cursor-pointer max-w-[220px]"
             >
                <div className="flex items-center gap-1.5 truncate">
                   <Landmark size={12} style={{ color: getAuraColor() }} className="flex-shrink-0" /> 
                   <span className="truncate">{selectedAccountLabels}</span>
                </div>
                <ChevronDown size={12} className="opacity-50 flex-shrink-0" />
             </button>
             
             <AnimatePresence>
               {showAccountDropdown && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: -10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: -10 }}
                   className="absolute top-full right-0 mt-2 w-64 glass bg-[#000000] border border-zinc-700 rounded-xl shadow-2xl z-40 overflow-hidden p-2.5 space-y-1.5"
                 >
                    <div className="flex justify-between items-center pb-1.5 border-b border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                      <span>Your Linked Accounts</span>
                      {selectedAccountIds.length > 0 && (
                        <button 
                          onClick={() => setSelectedAccountIds([])}
                          className="text-cyan-400 hover:text-white cursor-pointer"
                        >
                          Show All
                        </button>
                      )}
                    </div>

                    {connectedAccounts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-400 space-y-1">
                        <p>No accounts connected yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                        {connectedAccounts.map((acc) => {
                          const isSelected = selectedAccountIds.includes(acc.id);
                          return (
                            <label 
                              key={acc.id} 
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                                isSelected 
                                  ? 'bg-cyan-950/60 border-cyan-500/50 text-white' 
                                  : 'bg-[#080808] border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedAccountIds(prev => 
                                      prev.includes(acc.id) ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                                    );
                                  }}
                                  className="rounded border-zinc-600 bg-transparent text-cyan-500"
                                  style={{ accentColor: getAuraColor() }}
                                />
                                <div className="truncate">
                                  <b className="text-xs text-white block truncate">{acc.account_name}</b>
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {acc.last_4_digits ? `••••${acc.last_4_digits}` : acc.account_type || 'Active'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 ml-1.5 flex-shrink-0">
                                {acc.bank_id?.toUpperCase() || 'BANK'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
          
        </div>
      </header>

      {/* MOBILE TRANSACTION CARDS (Visible only < 768px) */}
      <div className="md:hidden space-y-4 pb-20">
         {processedData.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs">
               NO TRANSACTIONS FOUND
            </div>
         ) : (
            groupedData.map(group => (
               <div key={group.month} className="space-y-2">
                  <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md py-1.5 px-3 border-y border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex justify-between items-center">
                     <span>{group.month}</span>
                     <span>{group.txs.length} TXs</span>
                  </div>
                  <div className="space-y-2 px-1">
                     {group.txs.map(tx => {
                        const isEditing = editingId === (tx.id || tx.transaction_id);
                        const matchedAccount = connectedAccounts.find(a => matchTxToAccount(tx, a));

                        return (
                           <div key={tx.id || tx.transaction_id} className="bg-[#000000] border border-zinc-800 p-3 rounded-xl space-y-2 relative overflow-hidden shadow-lg">
                              <div className="flex justify-between items-start">
                                 <div className="space-y-0.5 max-w-[70%]">
                                    {isEditing ? (
                                       <input 
                                          type="text" 
                                          value={editForm.description} 
                                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                          className="bg-slate-900 text-xs font-bold text-white border border-slate-700 rounded px-1.5 py-0.5 w-full outline-none"
                                       />
                                    ) : (
                                       <p className="text-xs font-bold text-white tracking-wide truncate">{tx.description || 'Transaction'}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                                       <span>{tx.date}</span>
                                       {matchedAccount && (
                                         <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-sans text-[9px] font-bold">
                                           {matchedAccount.account_name}
                                         </span>
                                       )}
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-sm font-black font-mono text-white tracking-tight">
                                       ${Number(tx.amount).toFixed(2)}
                                    </span>
                                 </div>
                              </div>
                              
                              <div className="flex justify-between items-center pt-2 border-t border-zinc-850">
                                 {isEditing ? (
                                    <select 
                                       value={editForm.category}
                                       onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                       className="bg-slate-900 border border-slate-700 text-white rounded text-[10px] px-1 py-0.5 outline-none font-bold"
                                    >
                                       {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                 ) : (
                                    <span 
                                       className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-800"
                                       style={{ color: CATEGORY_COLORS[tx.category] || '#94a3b8' }}
                                    >
                                       {tx.category || 'General'}
                                    </span>
                                 )}

                                 <div className="flex items-center gap-2">
                                    {isEditing ? (
                                       <>
                                          <button onClick={() => handleSaveEdit(tx)} className="text-emerald-400 p-1 cursor-pointer"><Check size={14} /></button>
                                          <button onClick={() => setEditingId(null)} className="text-rose-400 p-1 cursor-pointer"><X size={14} /></button>
                                       </>
                                    ) : (
                                       <>
                                          <button onClick={() => handleEditClick(tx)} className="text-zinc-500 hover:text-white p-1 cursor-pointer"><Edit2 size={12} /></button>
                                          <button onClick={() => toggleVisibility(tx.id || tx.transaction_id, tx.visibility || 'Private')} className="text-zinc-500 hover:text-white p-1 cursor-pointer">
                                             {tx.visibility === 'Shared' ? <Eye size={12} className="text-cyan-400" /> : <EyeOff size={12} />}
                                          </button>
                                          <button onClick={(e) => handleDeleteTx(e, tx.id || tx.transaction_id)} className="text-zinc-600 hover:text-rose-500 p-1 cursor-pointer"><Trash2 size={12} /></button>
                                       </>
                                    )}
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            ))
         )}
      </div>

      {/* DESKTOP SPREADSHEET (Visible >= 768px) */}
      <div className="hidden md:block bg-[#000000] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
               <thead className="bg-[#080808] border-b border-zinc-800 text-[10px] text-zinc-400 tracking-widest uppercase select-none">
                  <tr>
                     <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-1">
                           <span>Date</span>
                           {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                     </th>
                     <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('description')}>
                        <div className="flex items-center gap-1">
                           <span>Description / Merchant</span>
                           {sortConfig?.key === 'description' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                     </th>
                     <th className="py-3 px-4">Connected Account</th>
                     <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
                        <div className="flex items-center gap-1">
                           <span>Category</span>
                           {sortConfig?.key === 'category' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                     </th>
                     <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('amount')}>
                        <div className="flex items-center justify-end gap-1">
                           <span>Amount</span>
                           {sortConfig?.key === 'amount' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                     </th>
                     <th className="py-3 px-4 text-center">Privacy</th>
                     <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-800/80">
                  {processedData.length === 0 ? (
                     <tr>
                        <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono text-xs">
                           NO TRANSACTIONS FOUND
                        </td>
                     </tr>
                  ) : (
                     processedData.map((tx) => {
                        const isEditing = editingId === (tx.id || tx.transaction_id);
                        const matchedAccount = connectedAccounts.find(a => matchTxToAccount(tx, a));

                        return (
                           <tr key={tx.id || tx.transaction_id} className="hover:bg-slate-900/40 transition-colors group">
                              <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">{tx.date}</td>
                              <td className="py-3 px-4 text-white font-bold font-sans">
                                 {isEditing ? (
                                    <input 
                                       type="text" 
                                       value={editForm.description} 
                                       onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                       className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs w-full text-white outline-none"
                                    />
                                 ) : (
                                    tx.description || 'Transaction'
                                 )}
                              </td>
                              <td className="py-3 px-4">
                                {matchedAccount ? (
                                  <span className="px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-sans text-[10px] font-bold inline-flex items-center gap-1">
                                    <Landmark size={10} />
                                    <span>{matchedAccount.account_name}</span>
                                  </span>
                                ) : (
                                  <span className="text-zinc-600 text-[10px] font-mono">Unlinked</span>
                                )}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                 {isEditing ? (
                                    <select 
                                       value={editForm.category}
                                       onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                       className="bg-slate-900 border border-slate-700 text-white rounded text-xs px-2 py-1 outline-none"
                                    >
                                       {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                 ) : (
                                    <span 
                                       className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-800 inline-block"
                                       style={{ color: CATEGORY_COLORS[tx.category] || '#94a3b8' }}
                                    >
                                       {tx.category || 'General'}
                                    </span>
                                 )}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
                                 ${Number(tx.amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                 <button 
                                    onClick={() => toggleVisibility(tx.id || tx.transaction_id, tx.visibility || 'Private')}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                 >
                                    {tx.visibility === 'Shared' ? <Eye size={14} className="text-cyan-400" /> : <EyeOff size={14} />}
                                 </button>
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                 <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    {isEditing ? (
                                       <>
                                          <button onClick={() => handleSaveEdit(tx)} className="text-emerald-400 p-1 hover:bg-emerald-950/50 rounded cursor-pointer"><Check size={14} /></button>
                                          <button onClick={() => setEditingId(null)} className="text-rose-400 p-1 hover:bg-rose-950/50 rounded cursor-pointer"><X size={14} /></button>
                                       </>
                                    ) : (
                                       <>
                                          <button onClick={() => handleEditClick(tx)} className="text-zinc-500 hover:text-white p-1 hover:bg-slate-800 rounded cursor-pointer"><Edit2 size={13} /></button>
                                          <button onClick={(e) => handleDeleteTx(e, tx.id || tx.transaction_id)} className="text-zinc-600 hover:text-rose-500 p-1 hover:bg-rose-950/30 rounded cursor-pointer"><Trash2 size={13} /></button>
                                       </>
                                    )}
                                 </div>
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
