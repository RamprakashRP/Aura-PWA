import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { BANK_CATALOG, getBankById } from '../../data/bankCatalog';
import { 
  Landmark, 
  PiggyBank, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Sparkles, 
  DollarSign,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type AccountType = 'chequing' | 'savings' | 'credit' | 'tfsa' | 'fhsa' | 'rrsp' | 'wallet';

export interface BankAccount {
  id: string;
  bankId: string;
  accountName: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  last4Digits?: string;
  
  // Chequing conditions
  monthlyFee?: number;
  minBalanceForFeeWaiver?: number;
  isStudentTier?: boolean;
  
  // Savings / HISA conditions
  interestRateApy?: number; // e.g. 2.5%
  promoInterestRateApy?: number; // e.g. 5.75%
  promoExpiryDate?: string; // YYYY-MM-DD
  
  // Credit Card conditions
  statementDateDay?: number; // e.g. 14th of month
  paymentDueDateDay?: number; // e.g. 5th of month
  creditLimit?: number;
  
  // Digital Wallet
  isApplePay?: boolean;
  isGoogleWallet?: boolean;
  isSamsungWallet?: boolean;
  
  notes?: string;
  createdAt: string;
}



// Helper to map Supabase snake_case rows to BankAccount
function mapDbToAccount(row: any): BankAccount {
  return {
    id: row.id,
    bankId: row.bank_id || row.bankId || 'other',
    accountName: row.account_name || row.accountName || 'Account',
    accountType: row.account_type || row.accountType || 'chequing',
    balance: Number(row.balance) || 0,
    currency: row.currency || 'CAD',
    last4Digits: row.last_4_digits || row.last4Digits,
    monthlyFee: row.monthly_fee !== undefined ? Number(row.monthly_fee) : row.monthlyFee,
    minBalanceForFeeWaiver: row.min_balance_for_fee_waiver !== undefined ? Number(row.min_balance_for_fee_waiver) : row.minBalanceForFeeWaiver,
    interestRateApy: row.interest_rate_apy !== undefined ? Number(row.interest_rate_apy) : row.interestRateApy,
    promoInterestRateApy: row.promo_interest_rate_apy !== undefined ? Number(row.promo_interest_rate_apy) : row.promoInterestRateApy,
    promoExpiryDate: row.promo_expiry_date || row.promoExpiryDate,
    statementDateDay: row.statement_date_day || row.statementDateDay,
    paymentDueDateDay: row.payment_due_date_day || row.paymentDueDateDay,
    creditLimit: row.credit_limit !== undefined ? Number(row.credit_limit) : row.creditLimit,
    isApplePay: row.is_apple_pay !== undefined ? row.is_apple_pay : row.isApplePay,
    isGoogleWallet: row.is_google_wallet !== undefined ? row.is_google_wallet : row.isGoogleWallet,
    notes: row.notes,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapAccountToDb(acc: BankAccount, userId: string): any {
  return {
    id: acc.id,
    user_id: userId,
    bank_id: acc.bankId,
    account_name: acc.accountName,
    account_type: acc.accountType,
    balance: acc.balance,
    currency: acc.currency || 'CAD',
    last_4_digits: acc.last4Digits || null,
    monthly_fee: acc.monthlyFee || 0,
    min_balance_for_fee_waiver: acc.minBalanceForFeeWaiver || 0,
    interest_rate_apy: acc.interestRateApy || 0,
    promo_interest_rate_apy: acc.promoInterestRateApy || 0,
    promo_expiry_date: acc.promoExpiryDate || null,
    statement_date_day: acc.statementDateDay || null,
    payment_due_date_day: acc.paymentDueDateDay || null,
    credit_limit: acc.creditLimit || null,
    is_apple_pay: !!acc.isApplePay,
    is_google_wallet: !!acc.isGoogleWallet,
    notes: acc.notes || null,
  };
}

export function AccountManager() {
  const { user } = useAuth();
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<'CA' | 'IN' | 'GLOBAL'>('CA');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bankId: 'td',
    accountName: 'TD All-Inclusive Chequing',
    accountType: 'chequing',
    balance: 4250.00,
    currency: 'CAD',
    last4Digits: '4821',
    monthlyFee: 16.95,
    minBalanceForFeeWaiver: 4000,
    interestRateApy: 0,
    promoInterestRateApy: 0,
    isApplePay: true,
    isGoogleWallet: false,
  });

  const getStorageKey = () => (user?.id ? `aura_bank_accounts_${user.id}` : 'aura_bank_accounts_guest');

  useEffect(() => {
    // Purge old global demo seed from user's browser
    const legacy = localStorage.getItem('aura_bank_accounts');
    if (legacy && (legacy.includes('acc-1') || legacy.includes('TD All-Inclusive Chequing'))) {
      localStorage.removeItem('aura_bank_accounts');
    }
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    // 1. Try Supabase if user is logged in
    try {
      if (user?.id && !localStorage.getItem('aura_sandbox_mode')) {
        const { data, error } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id);
        if (!error && data && data.length > 0) {
          const mapped = data.map(mapDbToAccount);
          setAccounts(mapped);
          localStorage.setItem(getStorageKey(), JSON.stringify(mapped));
          return;
        }
      }
    } catch (err) {
      console.warn('Supabase accounts fetch error:', err);
    }

    // 2. User-scoped local storage fallback
    const key = getStorageKey();
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const clean = parsed.filter((a: any) => !['acc-1', 'acc-2', 'acc-3', 'acc-4'].includes(a.id)).map(mapDbToAccount);
        setAccounts(clean);
        return;
      } catch {}
    }
    setAccounts([]);
  };

  const saveAccounts = async (newAccounts: BankAccount[]) => {
    setAccounts(newAccounts);
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(newAccounts));

    if (user?.id && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        const payloads = newAccounts.map(a => mapAccountToDb(a, user.id));
        const { error } = await supabase.from('bank_accounts').upsert(payloads, { onConflict: 'id' });
        if (error) {
          console.error('[SUPABASE ERROR] Failed to upsert bank_accounts:', error.message);
        } else {
          console.log('[SUPABASE SUCCESS] Bank accounts synced to cloud.');
        }
      } catch (e) {
        console.error('Supabase sync exception:', e);
      }
    }
  };



  const handleBankChange = (bankId: string) => {
    const bank = getBankById(bankId);
    setFormData((prev) => ({
      ...prev,
      bankId,
      accountName: `${bank.name} ${prev.accountType === 'chequing' ? 'Chequing' : prev.accountType === 'savings' ? 'Savings' : 'Card'}`,
      monthlyFee: bank.typicalChequingFee || 0,
      minBalanceForFeeWaiver: bank.typicalFeeWaiverMinBalance || 0,
    }));
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountName) return;

    if (editingAccount) {
      const updated = accounts.map((acc) =>
        acc.id === editingAccount.id
          ? ({ ...acc, ...formData, balance: Number(formData.balance) || 0 } as BankAccount)
          : acc
      );
      saveAccounts(updated);
      setEditingAccount(null);
    } else {
      const newAcc: BankAccount = {
        id: 'acc-' + Date.now(),
        bankId: formData.bankId || 'td',
        accountName: formData.accountName || 'Bank Account',
        accountType: formData.accountType || 'chequing',
        balance: Number(formData.balance) || 0,
        currency: formData.currency || 'CAD',
        last4Digits: formData.last4Digits || '',
        monthlyFee: Number(formData.monthlyFee) || 0,
        minBalanceForFeeWaiver: Number(formData.minBalanceForFeeWaiver) || 0,
        interestRateApy: Number(formData.interestRateApy) || 0,
        promoInterestRateApy: Number(formData.promoInterestRateApy) || 0,
        promoExpiryDate: formData.promoExpiryDate || '',
        statementDateDay: Number(formData.statementDateDay) || undefined,
        paymentDueDateDay: Number(formData.paymentDueDateDay) || undefined,
        creditLimit: Number(formData.creditLimit) || undefined,
        isApplePay: formData.isApplePay || false,
        isGoogleWallet: formData.isGoogleWallet || false,
        notes: formData.notes || '',
        createdAt: new Date().toISOString(),
      };
      saveAccounts([...accounts, newAcc]);
    }

    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this account?')) {
      saveAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  // Calculations
  const totalChequingBalance = accounts
    .filter((a) => a.accountType === 'chequing')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalSavingsBalance = accounts
    .filter((a) => a.accountType === 'savings' || a.accountType === 'tfsa' || a.accountType === 'fhsa')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalEstimatedAnnualInterest = accounts
    .filter((a) => a.accountType === 'savings' || a.accountType === 'tfsa')
    .reduce((sum, a) => {
      const activeRate = (a.promoInterestRateApy && a.promoInterestRateApy > 0 ? a.promoInterestRateApy : a.interestRateApy) || 0;
      return sum + (a.balance * (activeRate / 100));
    }, 0);

  const totalFeesAvoidedAnnual = accounts
    .filter((a) => a.accountType === 'chequing' && a.minBalanceForFeeWaiver && a.balance >= a.minBalanceForFeeWaiver)
    .reduce((sum, a) => sum + ((a.monthlyFee || 0) * 12), 0);

  return (
    <div className="space-y-6">
      {/* Country Switcher & Summary Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-[#080808]/90 border border-zinc-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🇨🇦</span>
            <h2 className="text-xl font-bold text-white">Bank Accounts & Cards</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Track Chequing balance waivers, High-Interest Savings (HISA), and credit limits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#000000] p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedCountry('CA')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedCountry === 'CA' ? 'bg-rose-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🇨🇦 Canada (CAD)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCountry('IN')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedCountry === 'IN' ? 'bg-orange-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🇮🇳 India (INR)
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl text-white shadow-lg cursor-pointer hover:scale-105 transition-all"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            <Plus size={15} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Financial Health Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Chequing Fee Waiver Card */}
        <div className="p-4 rounded-xl bg-[#080808]/90 border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Chequing Fees Avoided</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              +${totalFeesAvoidedAnnual.toFixed(2)}<span className="text-xs text-zinc-400 font-normal">/yr</span>
            </div>
            <div className="text-[11px] text-zinc-400">Via minimum balance waivers</div>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
            <DollarSign size={24} />
          </div>
        </div>

        {/* HISA Projected Interest Card */}
        <div className="p-4 rounded-xl bg-[#080808]/90 border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-cyan-400" />
              <span>Projected Savings Interest</span>
            </div>
            <div className="text-2xl font-black text-cyan-400">
              +${totalEstimatedAnnualInterest.toFixed(2)}<span className="text-xs text-zinc-400 font-normal">/yr</span>
            </div>
            <div className="text-[11px] text-zinc-400">~ ${(totalEstimatedAnnualInterest / 12).toFixed(2)}/mo passive payout</div>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400">
            <PiggyBank size={24} />
          </div>
        </div>

        {/* Total Liquid Capital */}
        <div className="p-4 rounded-xl bg-[#080808]/90 border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
              <Landmark size={14} className="text-rose-400" />
              <span>Total Liquid Capital</span>
            </div>
            <div className="text-2xl font-black text-white">
              ${(totalChequingBalance + totalSavingsBalance).toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-400">Chequing + Savings/HISA combined</div>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-400">
            <Sparkles size={24} />
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => {
          const bank = getBankById(acc.bankId);
          const isChequing = acc.accountType === 'chequing';
          const isSavings = acc.accountType === 'savings' || acc.accountType === 'tfsa' || acc.accountType === 'fhsa';
          const isCredit = acc.accountType === 'credit';
          
          // Chequing waiver check
          const hasMinBalance = acc.minBalanceForFeeWaiver && acc.minBalanceForFeeWaiver > 0;
          const isFeeWaived = hasMinBalance && acc.balance >= (acc.minBalanceForFeeWaiver || 0);
          const deficit = hasMinBalance ? (acc.minBalanceForFeeWaiver || 0) - acc.balance : 0;

          // Savings rate
          const activeApy = (acc.promoInterestRateApy && acc.promoInterestRateApy > 0 ? acc.promoInterestRateApy : acc.interestRateApy) || 0;
          const monthlyEarnings = acc.balance * (activeApy / 100) / 12;

          return (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-[#0a0a0a]/95 border border-zinc-800 relative overflow-hidden transition-all hover:border-zinc-700 shadow-xl flex flex-col justify-between"
            >
              {/* Top Bank Accent Stripe */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: bank.color }}
              />

              <div>
                {/* Header: Bank Logo Badge & Type */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shadow-md"
                      style={{ backgroundColor: bank.logoBg, color: bank.textColor }}
                    >
                      {bank.iconText}
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{acc.accountName}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                        <span>{bank.name}</span>
                        {acc.last4Digits && <span>• (••• {acc.last4Digits})</span>}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-zinc-300 border border-zinc-700">
                    {acc.accountType}
                  </span>
                </div>

                {/* Balance Display */}
                <div className="my-4 p-3.5 rounded-xl bg-[#000000]/70 border border-zinc-800/80 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-zinc-400">Current Balance</span>
                    <div className={`text-2xl font-black font-mono ${isCredit ? 'text-rose-400' : 'text-white'}`}>
                      ${Math.abs(acc.balance).toFixed(2)}
                      {isCredit && <span className="text-xs font-normal text-zinc-400 ml-1">due</span>}
                    </div>
                  </div>

                  {/* Digital Wallet Badges */}
                  <div className="flex items-center gap-1.5">
                    {acc.isApplePay && (
                      <span className="px-2 py-1 rounded bg-black text-white text-[10px] font-bold border border-zinc-700 flex items-center gap-1">
                         Pay
                      </span>
                    )}
                    {acc.isGoogleWallet && (
                      <span className="px-2 py-1 rounded bg-slate-800 text-cyan-400 text-[10px] font-bold border border-zinc-700 flex items-center gap-1">
                        G Pay
                      </span>
                    )}
                  </div>
                </div>

                {/* CONDITIONS / INTELLIGENCE MODULE */}
                {isChequing && hasMinBalance && (
                  <div className={`p-3 rounded-xl mb-3 text-xs flex items-center gap-2.5 border ${
                    isFeeWaived
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                  }`}>
                    {isFeeWaived ? (
                      <>
                        <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold">Monthly Fee Waived!</span> Keep balance ≥ ${acc.minBalanceForFeeWaiver} to save ${((acc.monthlyFee || 0) * 12).toFixed(2)}/yr.
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="text-rose-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold">Fee Alert:</span> Balance is ${deficit.toFixed(2)} below ${acc.minBalanceForFeeWaiver} threshold. Deposit before month-end to avoid ${acc.monthlyFee}/mo fee!
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isSavings && activeApy > 0 && (
                  <div className="p-3 rounded-xl mb-3 text-xs bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <TrendingUp size={14} />
                        <span>{activeApy}% APY {acc.promoInterestRateApy ? '(Promotional Rate)' : ''}</span>
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Yields ~ ${monthlyEarnings.toFixed(2)}/mo in passive interest
                      </div>
                    </div>
                    {acc.promoExpiryDate && (
                      <span className="text-[10px] bg-cyan-900/50 px-2 py-0.5 rounded text-cyan-200 border border-cyan-700">
                        Expires: {acc.promoExpiryDate}
                      </span>
                    )}
                  </div>
                )}

                {isCredit && acc.statementDateDay && (
                  <div className="p-3 rounded-xl mb-3 text-xs bg-slate-800/60 border border-zinc-700/80 text-zinc-300 flex justify-between items-center">
                    <div>
                      <span className="text-zinc-400">Statement Close:</span> <b>{acc.statementDateDay}th of month</b>
                    </div>
                    <div>
                      <span className="text-zinc-400">Due:</span> <b className="text-rose-400">{acc.paymentDueDateDay}th of month</b>
                    </div>
                  </div>
                )}

                {acc.notes && (
                  <p className="text-xs text-zinc-400 mt-2 mb-3 bg-[#050505]/60 p-2 rounded-lg border border-zinc-800/60">
                    💡 {acc.notes}
                  </p>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount(acc);
                    setFormData(acc);
                    setShowAddModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 flex items-center gap-1"
                >
                  <Edit3 size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(acc.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/40 text-xs font-semibold text-rose-400 hover:bg-rose-900/60 flex items-center gap-1 border border-rose-500/20"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT ACCOUNT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-[#0a0a0a] border border-zinc-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">
                {editingAccount ? 'Edit Bank Account' : 'Connect New Bank Account'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
              {/* Select Bank */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-2">Select Bank / Institution</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {BANK_CATALOG.filter(b => b.country === selectedCountry || b.country === 'GLOBAL').map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBankChange(b.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        formData.bankId === b.id
                          ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg'
                          : 'border-zinc-800 bg-[#050505]/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                        style={{ backgroundColor: b.logoBg, color: b.textColor }}
                      >
                        {b.iconText}
                      </div>
                      <span className="font-bold text-[11px] truncate w-full">{b.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Type Selector */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-2">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['chequing', 'savings', 'credit', 'tfsa', 'fhsa', 'wallet'] as AccountType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, accountType: type })}
                      className={`p-2 rounded-lg border text-center font-bold uppercase tracking-wider text-[11px] ${
                        formData.accountType === type
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                          : 'border-zinc-800 bg-[#050505]/60 text-zinc-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">Account Display Name</label>
                <input
                  type="text"
                  value={formData.accountName || ''}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="e.g. TD Every Day Chequing"
                  className="w-full bg-[#000000] border border-zinc-800 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              {/* Balance & Last 4 Digits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">Current Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance !== undefined ? formData.balance : ''}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                    placeholder="4250.00"
                    className="w-full bg-[#000000] border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.last4Digits || ''}
                    onChange={(e) => setFormData({ ...formData, last4Digits: e.target.value })}
                    placeholder="4821"
                    className="w-full bg-[#000000] border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Chequing Specific: Minimum Balance for Fee Waiver */}
              {formData.accountType === 'chequing' && (
                <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 space-y-3">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>Monthly Fee & Waiver Threshold</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1">Monthly Maintenance Fee ($/mo)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.monthlyFee !== undefined ? formData.monthlyFee : ''}
                        onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) })}
                        placeholder="16.95"
                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Min Balance to Waive Fee ($)</label>
                      <input
                        type="number"
                        value={formData.minBalanceForFeeWaiver !== undefined ? formData.minBalanceForFeeWaiver : ''}
                        onChange={(e) => setFormData({ ...formData, minBalanceForFeeWaiver: parseFloat(e.target.value) })}
                        placeholder="4000"
                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Savings / HISA Specific: Interest Rates */}
              {(formData.accountType === 'savings' || formData.accountType === 'tfsa') && (
                <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 space-y-3">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <TrendingUp size={14} />
                    <span>Interest Rates & Promotional Period</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-zinc-400 mb-1">Base APY (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.interestRateApy !== undefined ? formData.interestRateApy : ''}
                        onChange={(e) => setFormData({ ...formData, interestRateApy: parseFloat(e.target.value) })}
                        placeholder="2.25"
                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Promo APY (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.promoInterestRateApy !== undefined ? formData.promoInterestRateApy : ''}
                        onChange={(e) => setFormData({ ...formData, promoInterestRateApy: parseFloat(e.target.value) })}
                        placeholder="5.50"
                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Promo Expiration</label>
                      <input
                        type="date"
                        value={formData.promoExpiryDate || ''}
                        onChange={(e) => setFormData({ ...formData, promoExpiryDate: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Digital Wallets Checkboxes */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-2">Linked to Mobile Wallets</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isApplePay || false}
                      onChange={(e) => setFormData({ ...formData, isApplePay: e.target.checked })}
                      className="rounded bg-[#000000] border-zinc-800"
                    />
                    <span className="text-zinc-300">Apple Pay (iPhone / Apple Watch)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isGoogleWallet || false}
                      onChange={(e) => setFormData({ ...formData, isGoogleWallet: e.target.checked })}
                      className="rounded bg-[#000000] border-zinc-800"
                    />
                    <span className="text-zinc-300">Google Wallet (Android)</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">Notes & Conditions</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Free Interac e-Transfers included. 4% cashback on dining."
                  className="w-full bg-[#000000] border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-zinc-300 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white font-bold shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
