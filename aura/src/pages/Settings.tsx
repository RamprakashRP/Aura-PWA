import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, type AuraType } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Save, Globe, Users, Shield, Sparkles, CheckCircle } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { aura, setAura } = useTheme();
  
  const [currency, setCurrency] = useState('CAD');
  const [budget, setBudget] = useState('3000');
  
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Engine: Pre-Fetch Baseline FX Rates for Live Config Swap
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
     // If changing currency, dynamically remap numeric threshold based on CAD baseline
     if (currency !== newCurrency && exchangeRates[currency] && exchangeRates[newCurrency]) {
         const numBudget = Number(budget) || 0;
         const cadBase = numBudget / exchangeRates[currency]; // Normalize to base CAD vector
         const newBudget = cadBase * exchangeRates[newCurrency]; // Multiply to new target node
         setBudget(String(Math.round(newBudget))); // Snap exactly
     }
     setCurrency(newCurrency);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    
    // Save budget locally
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
    
    // Reset visual success pulse
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tighter text-white">SYSTEM <span className="text-brand-neon">PARAMETERS</span></h1>
      </header>

      <div className="space-y-6">
        {/* Localization */}
        <div className="glass p-6 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl group-hover:bg-brand-blue/10 transition-colors"></div>
          
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <Globe className="text-brand-blue" size={24} />
            <h2 className="text-xl font-bold text-white tracking-wide">Localization Engine</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Base Currency Node
                </label>
                <select 
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full bg-[#0a0f1a] border border-slate-700 rounded-lg px-4 py-3 text-white font-black tracking-widest uppercase focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors appearance-none cursor-pointer"
                  style={{ color: 'var(--color-brand-neon)' }}
                >
                  <option value="CAD" className="text-white">CAD - Canadian Dollar</option>
                  <option value="INR" className="text-white">INR - Indian Rupee</option>
                  <option value="USD" className="text-white">USD - US Dollar</option>
                  <option value="EUR" className="text-white">EUR - Euro</option>
                  <option value="GBP" className="text-white">GBP - British Pound</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Core Monthly Limit
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-[#0a0f1a] border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-white font-mono font-bold tracking-widest focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px] tracking-widest">{currency}</span>
                </div>
              </div>
            </div>
            <p className="text-xs font-mono text-slate-500">
              Foreign transactions will be automatically normalized via ExchangeRate-API for the Dashboard.
            </p>
          </div>
        </div>

        {/* Dynamic Anime Aura System */}
        <div className="glass p-6 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 transition-colors" style={{ backgroundColor: 'var(--color-brand-neon)' }}></div>
          
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <Sparkles className="text-brand-neon" size={24} style={{ color: 'var(--color-brand-neon)' }} />
            <h2 className="text-xl font-bold text-white tracking-wide">Aura Engine</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Aura Resonance
              </label>
              <select 
                value={aura}
                onChange={(e) => setAura(e.target.value as AuraType)}
                className="w-full bg-[#0a0f1a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors appearance-none"
                style={{ borderColor: 'var(--color-brand-neon)' }}
              >
                <option value="Berserker Red">Berserker Red</option>
                <option value="Void Black">Void Black</option>
                <option value="Hunter Green">Hunter Green</option>
                <option value="Super Saiyan Gold">Super Saiyan Gold</option>
                <option value="Ultra Instinct Silver">Ultra Instinct Silver</option>
                <option value="Demon Slayer Blue">Demon Slayer Blue</option>
                <option value="Hollow Purple">Hollow Purple</option>
              </select>
            </div>
            <p className="text-sm text-slate-500">
              Changes the global thematic energy signatures across the interface.
            </p>
          </div>
        </div>

        {/* Access Control */}
        <div className="glass p-6 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full blur-3xl group-hover:bg-brand-red/10 transition-colors"></div>
          
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <Shield className="text-brand-red" size={24} />
            <h2 className="text-xl font-bold text-white tracking-wide">Access Protocol</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#0a0f1a] rounded-lg border border-slate-800">
              <div>
                <p className="font-bold text-white">The Wall (RLS)</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Database Level Enforcement</p>
              </div>
              <div className="text-brand-green font-mono font-bold text-sm bg-brand-green/10 px-3 py-1 rounded">ACTIVE</div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-[#0a0f1a] rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Users className="text-slate-400" size={20} />
                <div>
                  <p className="font-bold text-white">Shared Household Group</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">No Linked Operator</p>
                </div>
              </div>
              <button className="text-sm text-brand-neon hover:text-white transition-colors font-bold uppercase tracking-widest">Invite</button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={saveSettings}
            disabled={saving || saved}
            className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 ${saved ? 'bg-[#00FF41] text-[#020617] scale-105' : 'bg-white hover:bg-slate-200 text-[#020617]'}`}
          >
            {saving ? (
               <><div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-[#020617] animate-spin"></div> Syncing...</>
            ) : saved ? (
               <><CheckCircle size={18} /> Constraints Committed</>
            ) : (
               <><Save size={18} /> Commit Configuration</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
