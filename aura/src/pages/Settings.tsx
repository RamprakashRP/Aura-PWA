import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, type AuraType } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Save, Globe, Users, Shield, Sparkles, CheckCircle, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const AURA_COLORS: Record<AuraType, string> = {
  "Berserker Red": "#FF0000",
  "Void Black": "#4A4A4A", // Darker aesthetic representation for rendering orb
  "Hunter Green": "#00FF41",
  "Super Saiyan Gold": "#FFD700",
  "Ultra Instinct Silver": "#E0E0E0",
  "Demon Slayer Blue": "#00BFFF",
  "Hollow Purple": "#8A2BE2",
  "Sakura Pink": "#ff69b4"
};

const Settings = () => {
  const { user } = useAuth();
  const { aura, setAura, getAuraColor } = useTheme();
  
  const [currency, setCurrency] = useState('CAD');
  const [budget, setBudget] = useState('3000');
  
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/CAD')
      .then(res => res.json())
      .then(data => {
         if (data?.rates) setExchangeRates(data.rates);
      }).catch(err => console.error("FX fetch failed in settings:", err));
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const savedBudget = localStorage.getItem(`aura_budget_${user.id}`);
      if (savedBudget) setBudget(savedBudget);
      const { data } = await supabase
        .from('profiles')
        .select('home_currency')
        .eq('id', user.id)
        .single();
      
      if (data?.home_currency) setCurrency(data.home_currency);
    };
    fetchProfile();
  }, [user]);

  const handleCurrencyChange = (newCurrency: string) => {
     if (currency !== newCurrency && exchangeRates[currency] && exchangeRates[newCurrency]) {
         const numBudget = Number(budget) || 0;
         const cadBase = numBudget / exchangeRates[currency]; 
         const newBudget = cadBase * exchangeRates[newCurrency]; 
         setBudget(String(Math.round(newBudget))); 
     }
     setCurrency(newCurrency);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    
    if (budget && !isNaN(Number(budget))) {
       localStorage.setItem(`aura_budget_${user.id}`, budget);
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
         id: user.id, 
         home_currency: currency,
         email: user.email || 'operator@aura.com',
         name: user.user_metadata?.name || user.email?.split('@')[0] || 'Operator'
      });
      
    localStorage.setItem(`aura_home_currency_${user.id}`, currency);

    if (error) console.error("Failed to update profile", error);
    
    setSaving(false);
    setSaved(true);
    
    setTimeout(() => setSaved(false), 2000);
  };

  const nameDisplay = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown Operative';

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-4 md:mb-10 text-center md:text-left mt-4 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white">SYSTEM <span style={{ color: getAuraColor() }}>PARAMETERS</span></h1>
      </header>

      <div className="space-y-6">
         
        {/* Character Sheet / Identity Card */}
        <div className="glass p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800 relative overflow-hidden flex flex-row items-center gap-4 md:gap-6 shadow-2xl" style={{ borderTopColor: getAuraColor(), borderTopWidth: '4px' }}>
           <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 md:border-4 flex-shrink-0 animate-pulse-slow shadow-xl overflow-hidden bg-slate-900" style={{ borderColor: getAuraColor(), boxShadow: `0 0 20px ${getAuraColor()}40` }}>
              <img src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=AuraMonarch&backgroundColor=transparent"} alt="Avatar" className="w-full h-full object-cover" />
           </div>
           <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight truncate">{nameDisplay}</h2>
              <div className="flex items-center gap-2 mt-1 md:mt-2 w-full overflow-hidden">
                 <span className="px-2 py-0.5 rounded text-[8px] md:text-[10px] uppercase tracking-widest font-black text-[#020617] whitespace-nowrap" style={{ backgroundColor: getAuraColor() }}>Hunter/Student</span>
                 <span className="px-2 py-0.5 rounded bg-slate-800 text-[8px] md:text-[10px] text-slate-400 font-mono tracking-widest truncate">{user?.email}</span>
              </div>
           </div>
        </div>

        {/* Dynamic Anime Aura System (ORB SELECTOR) */}
        <div className="glass p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 transition-colors" style={{ backgroundColor: getAuraColor() }}></div>
          
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 border-b border-slate-800 pb-3 md:pb-4">
            <Sparkles size={20} style={{ color: getAuraColor() }} className="flex-shrink-0" />
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Aura Engine</h2>
          </div>
          
          <div>
            <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Resonance Frequency
            </label>
            <div className="flex bg-[#0a0f1a] rounded-xl p-2 md:p-3 border border-slate-800 overflow-x-auto hide-scrollbar snap-x gap-3 md:gap-4 md:justify-between mask-edges">
               {(Object.keys(AURA_COLORS) as AuraType[]).map((theme) => {
                  const isActive = aura === theme;
                  const colorHex = AURA_COLORS[theme];
                  return (
                     <button
                        key={theme}
                        onClick={() => setAura(theme)}
                        className="flex flex-col items-center gap-2 flex-shrink-0 snap-center focus:outline-none group relative"
                     >
                        <motion.div 
                           animate={{ 
                              scale: isActive ? 1.2 : 1,
                              borderColor: isActive ? '#fff' : 'transparent',
                              boxShadow: isActive ? `0 0 20px ${colorHex}80, inset 0 0 10px ${colorHex}` : 'none'
                           }}
                           className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all block relative"
                           style={{ backgroundColor: colorHex }}
                        >
                           {isActive && <div className="absolute inset-0 border-2 border-white rounded-full scale-110 opacity-50"></div>}
                        </motion.div>
                        <span className={`text-[8px] font-bold uppercase tracking-widest max-w-[60px] text-center leading-tight transition-colors ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`}>
                           {theme.replace(' ', '\n')}
                        </span>
                     </button>
                  );
               })}
            </div>
            <p className="text-[10px] md:text-sm text-slate-500 mt-4 leading-relaxed">
               Modifies UI chromatic baseline. Currently radiating <span className="font-bold inline-block" style={{ color: getAuraColor() }}>{aura}</span>.
            </p>
          </div>
        </div>

        {/* Localization */}
        <div className="glass p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl group-hover:bg-brand-blue/10 transition-colors"></div>
          
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 border-b border-slate-800 pb-3 md:pb-4">
            <Globe className="text-brand-blue flex-shrink-0" size={20} />
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Localization Core</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full items-end">
              <div className="flex-1 w-full relative">
                <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Base Config Node
                </label>
                <select 
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full bg-[#0a0f1a] border border-slate-700 rounded-xl px-4 py-0 text-white font-black text-sm md:text-base tracking-widest uppercase focus:outline-none transition-colors appearance-none cursor-pointer flex items-center min-h-[44px]"
                  style={{ color: getAuraColor(), borderColor: `${getAuraColor()}40` }}
                >
                  <option value="CAD" className="text-white">CAD - Canadian Dollar</option>
                  <option value="INR" className="text-white">INR - Indian Rupee</option>
                  <option value="USD" className="text-white">USD - US Dollar</option>
                  <option value="EUR" className="text-white">EUR - Euro</option>
                  <option value="GBP" className="text-white">GBP - British Pound</option>
                </select>
              </div>
              
              <div className="flex-1 w-full relative">
                <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex justify-between">
                  Core Monthly Limit
                  <span className="text-[8px] text-slate-600">Auto-Scaling</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-[#0a0f1a] border border-slate-700 rounded-xl pl-8 pr-12 py-0 text-white font-mono font-bold text-sm md:text-base tracking-widest focus:outline-none transition-colors min-h-[44px]"
                    style={{ borderColor: `${getAuraColor()}40` }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[10px] tracking-widest" style={{ color: getAuraColor() }}>{currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access Control (Compact Toggles) */}
        <div className="glass p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full blur-3xl group-hover:bg-brand-red/10 transition-colors"></div>
          
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 border-b border-slate-800 pb-3 md:pb-4">
            <Shield className="text-slate-400 flex-shrink-0" size={20} />
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Access Protocol</h2>
          </div>
          
          <div className="space-y-3">
             {/* iOS Style Toggle Card */}
            <div className="flex items-center justify-between p-3 md:p-4 bg-[#0a0f1a] rounded-xl border border-slate-800">
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-bold text-white text-sm md:text-base">The Wall (Rows)</p>
                <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest w-full truncate">Zero-Knowledge Database Shield</p>
              </div>
              {/* Toggle Switch */}
              <div className="relative inline-flex items-center cursor-not-allowed">
                 <input type="checkbox" className="sr-only peer" checked readOnly />
                 <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: getAuraColor() }}></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 md:p-4 bg-[#0a0f1a] rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <Users className="text-slate-400 flex-shrink-0" size={18} />
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm md:text-base truncate">Household Pairing</p>
                  <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest truncate">Aura Synchronization Offline</p>
                </div>
              </div>
              <button disabled className="text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-500 transition-colors font-bold uppercase tracking-widest opacity-50 cursor-not-allowed">Locked</button>
            </div>
          </div>
        </div>

        {/* Global Save Action Float (Mobile Bottom Pin) */}
        <div className="fixed md:relative bottom-24 md:bottom-auto left-4 right-4 md:left-auto md:right-auto md:flex md:justify-end z-40 bg-transparent pointer-events-none md:pointer-events-auto">
           <div className="w-full flex justify-end gap-2 md:gap-0 mt-4 md:mt-0 pointer-events-auto">
              {/* Optional: Add logout or other critical actions here in future on mobile */}
              <button 
                onClick={saveSettings}
                disabled={saving || saved}
                className="w-full md:w-auto px-6 py-0 rounded-xl font-bold uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-2 min-h-[44px] border-2"
                style={{
                   backgroundColor: saved ? '#00FF41' : '#0a0f1a',
                   borderColor: saved ? '#00FF41' : getAuraColor(),
                   color: saved ? '#020617' : getAuraColor(),
                   transform: saved ? 'scale(1.02)' : 'none',
                   boxShadow: saved ? '0 10px 30px #00FF4140' : `0 10px 30px ${getAuraColor()}40`
                }}
              >
                {saving ? (
                   <><div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> Writing...</>
                ) : saved ? (
                   <><CheckCircle size={16} /> Matrix Written</>
                ) : (
                   <><Save size={16} /> Commit Configuration</>
                )}
              </button>
           </div>
        </div>

      </div>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default Settings;
