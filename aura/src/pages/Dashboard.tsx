import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { Sparkles, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const getCurrencySymbol = (cur: string) => {
  if (cur === 'INR') return '₹';
  if (cur === 'EUR') return '€';
  if (cur === 'GBP') return '£';
  return '$';
};

const Dashboard = () => {
  const { user } = useAuth();
  const { getAuraColor, getAuraGlow } = useTheme();
  
  // States
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Engine States
  const [homeCurrency, setHomeCurrency] = useState('CAD');
  const [activeCurrency, setActiveCurrency] = useState('CAD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(false);

  // Dashboard Controls
  type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [baseMonthlyBudget, setBaseMonthlyBudget] = useState(3000);

  // 1. Initial Data Fetch
  useEffect(() => {
    fetchDashboardData();
    if (user?.id) {
       const saved = localStorage.getItem(`aura_budget_${user.id}`);
       if (saved) setBaseMonthlyBudget(Number(saved));
    }
  }, [user]);

  // 2. Real-time Exchange Rate Fetcher
  useEffect(() => {
    fetchExchangeRates(activeCurrency);
  }, [activeCurrency]);

  const fetchExchangeRates = async (base: string) => {
    setRatesLoading(true);
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
      const data = await res.json();
      if (data && data.rates) {
        setExchangeRates(data.rates);
      }
    } catch (err) {
      console.error("Failed to fetch live exchange rates", err);
    }
    setRatesLoading(false);
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('home_currency')
        .eq('id', user.id)
        .single();
        
      if (profile?.home_currency) {
         setHomeCurrency(profile.home_currency);
         setActiveCurrency(profile.home_currency);
      }

      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .or(`user_id.eq.${user.id},visibility.eq.Shared`)
        .order('date', { ascending: true });

      if (txs) {
        setTransactions(txs);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      setLoading(false);
    }
  };

  // --- CROSS-CURRENCY BUDGET NORMALIZATION ---
  const normalizedBaseBudget = useMemo(() => {
     if (activeCurrency === homeCurrency) return baseMonthlyBudget;
     
     // Calculate strict scalar adjustment using Live API payload
     const rate = exchangeRates[homeCurrency];
     if (rate) {
        return Math.round(baseMonthlyBudget / rate);
     }
     return baseMonthlyBudget;
  }, [baseMonthlyBudget, activeCurrency, homeCurrency, exchangeRates]);

  // --- OVERRIDE BUDGET CALCULATION VIA TEMPORAL MATRIX ---
  const dynamicBudgetLimit = useMemo(() => {
     const budget = normalizedBaseBudget;
     
     if (timeRange === '1M') return budget;
     if (timeRange === '3M') return budget * 3;
     if (timeRange === '6M') return budget * 6;
     if (timeRange === '1Y') return budget * 12;
     
     if (timeRange === 'CUSTOM') {
        let months = 1;
        if (customDateFrom && customDateTo) {
           const from = new Date(customDateFrom).getTime();
           const to = new Date(customDateTo).getTime();
           const msPerMonth = 30 * 24 * 60 * 60 * 1000;
           months = Math.max(1, Math.ceil((to - from) / msPerMonth));
        }
        return budget * months;
     }

     if (transactions.length > 0) {
        const latest = Math.max(...transactions.map(t => new Date(t.date).getTime()));
        const oldest = Math.min(...transactions.map(t => new Date(t.date).getTime()));
        const msPerMonth = 30 * 24 * 60 * 60 * 1000;
        let months = Math.ceil((latest - oldest) / msPerMonth);
        if (months === 0) months = 1;
        return budget * months;
     }
     
     return budget;
  }, [timeRange, normalizedBaseBudget, transactions, customDateFrom, customDateTo]);

  // --- MATHEMATICAL NORMALIZATION ENGINE ---
  const aggregatedData = useMemo(() => {
    let result = [...transactions];

    if (timeRange === 'CUSTOM') {
      if (customDateFrom) {
         const fromTime = new Date(customDateFrom + "T00:00:00").getTime();
         result = result.filter(t => new Date(t.date).getTime() >= fromTime);
      }
      if (customDateTo) {
         const toTime = new Date(customDateTo + "T23:59:59").getTime();
         result = result.filter(t => new Date(t.date).getTime() <= toTime);
      }
    } else if (timeRange !== 'ALL' && result.length > 0) {
      const latestEpoch = Math.max(...result.map(t => new Date(t.date).getTime()));
      const multiplier = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
      const windowMs = multiplier * 30 * 24 * 60 * 60 * 1000;
      result = result.filter(t => new Date(t.date).getTime() >= (latestEpoch - windowMs));
    }

    const dailyMap: Record<string, number> = {};
    
    result.forEach(tx => {
      let normalizedAmount = tx.amount;
      if (tx.currency !== activeCurrency) {
         const rate = exchangeRates[tx.currency];
         if (rate) {
            normalizedAmount = tx.amount / rate;
         }
      }
      const absAmount = Math.abs(normalizedAmount);
      if (dailyMap[tx.date]) {
         dailyMap[tx.date] += absAmount;
      } else {
         dailyMap[tx.date] = absAmount;
      }
    });

    return Object.entries(dailyMap)
       .map(([name, spend]) => ({ name, spend }))
       .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [transactions, activeCurrency, exchangeRates, timeRange, customDateFrom, customDateTo]);

  // --- STATS ---
  const totalSpend = aggregatedData.reduce((sum: number, day: any) => sum + day.spend, 0);
  const healthPercent = Math.min((totalSpend / dynamicBudgetLimit) * 100, 100);
  
  // Dashboard Core Engine colors map exactly to the User's chosen Theme
  const activeColor = getAuraColor(); 
  const activeGlow = getAuraGlow();

  // ISOLATED TRICOLOR HEALTH ENGINE (Only emitted via the Budget Core)
  let healthColor = '#00FF41'; // Safe Green
  let healthShadow = `0 0 25px #00FF4140`;

  if (healthPercent > 50 && healthPercent <= 80) {
     healthColor = '#FFD700'; // Warning Yellow
     healthShadow = `0 0 25px #FFD70040`;
  } else if (healthPercent > 80) {
     healthColor = '#FF0000'; // Berserker Red
     healthShadow = `0 0 25px #FF000040`;
  }

  const symbol = getCurrencySymbol(activeCurrency);

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: getAuraColor(), borderTopColor: 'transparent' }}></div></div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto animate-in fade-in duration-700">
        <div className="w-48 h-48 mb-6 relative">
          <div className="absolute inset-0 rounded-full animate-pulse opacity-20 blur-2xl" style={{ backgroundColor: getAuraColor() }}></div>
          <div className="w-full h-full border-2 border-dashed rounded-full flex items-center justify-center" style={{ borderColor: getAuraColor() }}>
            <Sparkles size={48} style={{ color: getAuraColor() }} />
          </div>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Aura Inactive</h2>
        <p className="text-slate-400 mb-8">Your financial aura is quiet. Upload a real Kotak statement to awaken it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
             Aura <span style={{ color: getAuraColor() }}>Engine</span>
             {ratesLoading && <RefreshCw size={18} className="animate-spin text-slate-500" />}
          </h1>
          <p className="text-slate-400 mt-2 font-mono text-[10px] uppercase tracking-widest"><Sparkles size={12} className="inline mr-1" style={{ color: getAuraColor() }}/> Operator: {user?.email}</p>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1 font-bold">Base Node</p>
          <select 
             value={activeCurrency}
             onChange={(e) => setActiveCurrency(e.target.value)}
             className="glass px-3 py-1.5 rounded-lg font-black tracking-widest bg-[#020617] focus:outline-none appearance-none cursor-pointer text-center border shadow-xl transition-all" 
             style={{ color: getAuraColor(), borderColor: `${getAuraColor()}40` }}
          >
             {['CAD', 'INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c} value={c} className="bg-[#020617] text-white font-bold">{c}</option>)}
          </select>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Output Card - Follows Global Theme */}
        <motion.div 
          animate={{ boxShadow: activeGlow }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="glass p-6 rounded-2xl relative overflow-hidden group border-l-4"
          style={{ borderLeftColor: activeColor }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all" style={{ backgroundColor: `${activeColor}20` }}></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Normalized Output</p>
          <div className="text-4xl font-black text-white flex items-baseline gap-2">
            {symbol}{totalSpend.toFixed(2)}
            <span className="text-sm font-medium flex items-center opacity-60 ml-2" style={{ color: activeColor }}><TrendingUp size={16}/></span>
          </div>
        </motion.div>

        {/* Budget Core Card - STRICT TRICOLOR HEALTH ENGINE */}
        <motion.div 
          animate={{ boxShadow: healthShadow }}
          className="glass p-6 rounded-2xl relative overflow-hidden border-l-4"
          style={{ borderLeftColor: healthColor }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all" style={{ backgroundColor: `${healthColor}20` }}></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 flex justify-between">
            Budget Core
            {healthPercent > 80 && <AlertCircle size={14} className="text-[#FF0000]" />}
          </p>
          <div className="mt-2">
            <div className="flex justify-between text-sm mb-1 font-mono">
              <span style={{ color: healthColor }}>{healthPercent.toFixed(1)}% Load</span>
              <span className="text-slate-500" title={`Adjust ${homeCurrency} Budget in System Settings`}>
                 {symbol}{dynamicBudgetLimit} Max
              </span>
            </div>
            <div className="w-full h-3 bg-[#0a0f1a] rounded-full overflow-hidden border border-slate-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${healthPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full" 
                style={{ backgroundColor: healthColor, boxShadow: `0 0 10px ${healthColor}` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Temporal Matrix Card - Follows Global Theme */}
        <motion.div 
          animate={{ boxShadow: `0 0 15px ${getAuraColor()}20` }}
          className="glass p-6 rounded-2xl relative overflow-hidden border-l-4 shadow-2xl flex flex-col justify-center"
          style={{ borderLeftColor: getAuraColor() }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all" style={{ backgroundColor: `${getAuraColor()}15` }}></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Temporal Matrix</p>
          <div className="flex bg-[#0a0f1a] rounded-lg p-1 border border-slate-800/80 w-fit z-10 shadow-inner">
             {['1M', '3M', '6M', '1Y', 'ALL', 'CUSTOM'].map(opt => (
                <button 
                  key={opt}
                  onClick={() => setTimeRange(opt as TimeRange)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all ${timeRange === opt ? 'text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  style={timeRange === opt ? { backgroundColor: `${getAuraColor()}30`, boxShadow: `0 0 10px ${getAuraColor()}40` } : {}}
                >
                   {opt}
                </button>
             ))}
          </div>
          
          {/* Dashboard Custom Bounds Calendar Embed */}
          {timeRange === 'CUSTOM' && (
             <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex items-center gap-2 bg-[#0a0f1a] rounded-lg p-1 border border-slate-800 shadow-xl mt-3 w-fit z-20"
             >
                <input 
                   type="date" 
                   value={customDateFrom} 
                   onChange={e => setCustomDateFrom(e.target.value)} 
                   className="bg-transparent text-[10px] font-mono text-slate-300 px-2 py-1 outline-none" 
                   style={{ colorScheme: 'dark' }} 
                />
                <span className="text-slate-600">-</span>
                <input 
                   type="date" 
                   value={customDateTo} 
                   onChange={e => setCustomDateTo(e.target.value)} 
                   className="bg-transparent text-[10px] font-mono text-slate-300 px-2 py-1 outline-none" 
                   style={{ colorScheme: 'dark' }} 
                />
             </motion.div>
          )}
        </motion.div>
      </div>

      {/* Chart Section - Follows Global Theme */}
      <motion.div 
         animate={{ boxShadow: activeGlow }}
         className="glass p-6 mb-8 rounded-2xl border-t-2 h-[400px] shadow-2xl"
         style={{ borderTopColor: activeColor }}
      >
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              Energy Consumption 
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 opacity-60" style={{ color: getAuraColor() }}>
                 {timeRange}
              </span>
           </h3>
           <span className="text-[10px] uppercase font-black tracking-widest" style={{ color: getAuraColor() }}>Live Normalizer: {activeCurrency}</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={aggregatedData}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeColor} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(value) => `${symbol}${value}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: `1px solid ${activeColor}40`, borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: activeColor, fontWeight: 'bold' }}
              formatter={(value: any) => [`${symbol}${Number(value).toFixed(2)}`, 'Normalized Output']}
            />
            <Area type="monotone" dataKey="spend" stroke={activeColor} strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

export default Dashboard;
