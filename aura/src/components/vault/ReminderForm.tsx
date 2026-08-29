import React, { useState } from 'react';
import type { CreateReminderInput, ReminderType, Milestone } from '../../lib/vaultApi';
import { 
  CreditCard, 
  Landmark, 
  GraduationCap, 
  Package, 
  Calendar, 
  Check, 
  Plus, 
  Trash2, 
  Clock, 
  Sparkles 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ReminderFormProps {
  initialData?: Partial<CreateReminderInput>;
  onSubmit: (data: CreateReminderInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ReminderForm({ initialData, onSubmit, onCancel, submitLabel = 'Save & Protect' }: ReminderFormProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [reminderType, setReminderType] = useState<ReminderType>(
    initialData?.reminderType || 'subscription'
  );

  const getFormattedDate = (dateVal?: string | null, daysOffset = 30) => {
    if (!dateVal) {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split('T')[0];
    }
    return dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
  };

  const [formData, setFormData] = useState<CreateReminderInput>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'subscription',
    reminderType: initialData?.reminderType || 'subscription',
    startDate: initialData?.startDate ? getFormattedDate(initialData.startDate, 0) : getFormattedDate(null, 0),
    renewalDate: getFormattedDate(initialData?.renewalDate, 30),
    statementDate: getFormattedDate(initialData?.statementDate, 15),
    paymentDueDate: getFormattedDate(initialData?.paymentDueDate, 35),
    issuerBank: initialData?.issuerBank || '',
    last4Digits: initialData?.last4Digits || '',
    milestones: initialData?.milestones || [
      { id: '1', title: 'Get student proof / enrollment document', completed: false },
      { id: '2', title: 'Visit branch or message support to switch tier', completed: false },
      { id: '3', title: 'Confirm zero-maintenance fee waiver applied', completed: false },
    ],
    estimatedSavings: initialData?.estimatedSavings || undefined,
    actionUrl: initialData?.actionUrl || initialData?.url || '',
    remindDaysBefore: initialData?.remindDaysBefore && initialData.remindDaysBefore.length > 0
      ? initialData.remindDaysBefore
      : [14, 7, 2, 1],
    amount: initialData?.amount ? Number(initialData.amount) : undefined,
    currency: initialData?.currency || 'CAD',
    billingCycle: initialData?.billingCycle || 'monthly',
    autoRenew: initialData?.autoRenew !== undefined ? initialData.autoRenew : true,
    url: initialData?.url || '',
    notes: initialData?.notes || '',
    tags: initialData?.tags || [],
  });

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTypeChange = (type: ReminderType) => {
    setReminderType(type);
    setFormData((prev) => ({
      ...prev,
      reminderType: type,
      category: type === 'credit_card' ? 'credit_card' : type === 'bank_offer' ? 'bank' : type === 'fee_transition' ? 'student_fee' : type === 'return_warranty' ? 'return' : prev.category,
    }));
  };

  const applyFeePreset = (presetType: 'student_switch' | 'card_retention') => {
    const today = new Date();
    if (presetType === 'student_switch') {
      const oneYear = new Date(today);
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      setFormData((prev) => ({
        ...prev,
        title: 'Checking Account (Switch to Student Tier)',
        issuerBank: 'TD / Scotiabank / RBC',
        renewalDate: oneYear.toISOString().split('T')[0],
        estimatedSavings: 144,
        notes: 'Free 1-year trial ends! Bring student transcript or ID to local branch to convert to student checking to avoid monthly fees.',
        milestones: [
          { id: '1', title: 'Download student enrollment verification PDF', completed: false },
          { id: '2', title: 'Visit bank branch or submit student verification online', completed: false },
          { id: '3', title: 'Verify monthly maintenance fee is $0 on next statement', completed: false },
        ],
        remindDaysBefore: [30, 14, 7, 2],
      }));
    } else if (presetType === 'card_retention') {
      const elevenMonths = new Date(today);
      elevenMonths.setMonth(elevenMonths.getMonth() + 11);
      setFormData((prev) => ({
        ...prev,
        title: 'Annual Fee Card (Call for Retention Offer)',
        issuerBank: 'Amex / Scotia / RBC',
        renewalDate: elevenMonths.toISOString().split('T')[0],
        estimatedSavings: 150,
        notes: 'Call customer service before annual fee posts. Ask for retention points bonus or fee waiver.',
        milestones: [
          { id: '1', title: 'Check account points balance and statement close date', completed: false },
          { id: '2', title: 'Call number on back of card & ask for retention offers', completed: false },
          { id: '3', title: 'Accept points bonus or downgrade to no-fee card', completed: false },
        ],
        remindDaysBefore: [30, 14, 7],
      }));
    }
  };

  const toggleRemindDay = (day: number) => {
    const current = formData.remindDaysBefore || [];
    let updated: number[];
    if (current.includes(day)) {
      updated = current.filter((d) => d !== day);
      if (updated.length === 0) updated = [day];
    } else {
      updated = [...current, day].sort((a, b) => b - a);
    }
    setFormData((prev) => ({ ...prev, remindDaysBefore: updated }));
  };

  const addMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    const newM: Milestone = {
      id: Date.now().toString(),
      title: newMilestoneTitle.trim(),
      completed: false,
    };
    setFormData((prev) => ({
      ...prev,
      milestones: [...(prev.milestones || []), newM],
    }));
    setNewMilestoneTitle('');
  };

  const removeMilestone = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: (prev.milestones || []).filter((m) => m.id !== id),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title or Card/Account name is required';

    if (reminderType === 'credit_card' && !formData.paymentDueDate && !formData.renewalDate) {
      newErrors.paymentDueDate = 'Payment due date is required';
    } else if (!formData.renewalDate) {
      newErrors.renewalDate = 'Target date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateReminderInput = {
        ...formData,
        reminderType,
        renewalDate: formData.renewalDate || formData.paymentDueDate || new Date().toISOString(),
      };
      await onSubmit(payload);
    } catch (error) {
      console.error('Failed to submit reminder:', error);
      alert('Failed to save reminder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remindDays = formData.remindDaysBefore || [14, 7, 2, 1];

  const TYPE_OPTIONS = [
    { id: 'credit_card', label: 'Credit Card', icon: CreditCard, color: 'text-cyan-400' },
    { id: 'bank_offer', label: 'Bank Bonus', icon: Landmark, color: 'text-emerald-400' },
    { id: 'fee_transition', label: 'Student / Fee Expiry', icon: GraduationCap, color: 'text-amber-400' },
    { id: 'return_warranty', label: 'Return / Warranty', icon: Package, color: 'text-pink-400' },
    { id: 'subscription', label: 'Subscription', icon: Calendar, color: 'text-rose-400' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-slate-100">
      {/* 1. Type Selector Tabs */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Choose What You Want to Track & Save On:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = reminderType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTypeChange(opt.id as ReminderType)}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center ${
                  isSelected
                    ? 'bg-slate-800/90 border-slate-500 text-white shadow-lg scale-102'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
                style={{
                  borderColor: isSelected ? auraColor : undefined,
                  boxShadow: isSelected ? `0 0 15px ${auraColor}30` : 'none',
                }}
              >
                <Icon size={18} className={opt.color} />
                <span className="leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fee Transition Preset Helper */}
      {reminderType === 'fee_transition' && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <Sparkles size={16} className="text-amber-400 flex-shrink-0" />
            <span>Quick 1-Click Template:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyFeePreset('student_switch')}
              className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-[11px] font-bold text-amber-200 border border-amber-500/40 cursor-pointer"
            >
              🎓 1-Yr Student Switch
            </button>
            <button
              type="button"
              onClick={() => applyFeePreset('card_retention')}
              className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-[11px] font-bold text-amber-200 border border-amber-500/40 cursor-pointer"
            >
              💳 Card Retention
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Form Fields */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {reminderType === 'credit_card' ? 'Card Name / Product *' :
             reminderType === 'bank_offer' ? 'Bank Account / Bonus Offer Name *' :
             reminderType === 'fee_transition' ? 'Account or Service Being Converted *' :
             reminderType === 'return_warranty' ? 'Item Name / Purchase *' : 'Subscription Name *'}
          </label>
          <input
            type="text"
            placeholder={
              reminderType === 'credit_card' ? 'e.g. Scotia Momentum Visa Infinite, TD Aeroplan' :
              reminderType === 'bank_offer' ? 'e.g. Scotiabank $350 Checking Bonus' :
              reminderType === 'fee_transition' ? 'e.g. TD Unlimited Checking (Free 1-Yr Student Trial)' :
              reminderType === 'return_warranty' ? 'e.g. Sony WH-1000XM5 Headphones (Amazon)' : 'e.g. Netflix 4K, Spotify Premium, iCloud'
            }
            value={formData.title || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
            required
          />
          {errors.title && <p className="text-[11px] text-rose-400 mt-1">{errors.title}</p>}
        </div>

        {/* 2-Column Grid for Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Issuer Bank / Store */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {reminderType === 'return_warranty' ? 'Retailer / Store' : 'Issuer Bank / Provider'}
            </label>
            <input
              type="text"
              placeholder={reminderType === 'return_warranty' ? 'e.g. Amazon, Best Buy, Apple' : 'e.g. TD, RBC, Scotia, BMO, CIBC, Tangerine'}
              value={formData.issuerBank || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, issuerBank: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
            />
          </div>

          {/* Last 4 Digits (if card) or Category */}
          {reminderType === 'credit_card' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Last 4 Digits (Optional)
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="e.g. 4821"
                value={formData.last4Digits || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, last4Digits: e.target.value.replace(/\D/g, '') }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={formData.category || 'subscription'}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="subscription">Subscription / Streaming</option>
                <option value="bank">Banking / Finance</option>
                <option value="student_fee">Student / Fee Expiry</option>
                <option value="return">Shopping / Warranty</option>
                <option value="software">Software / SaaS</option>
                <option value="utility">Utilities / Internet</option>
              </select>
            </div>
          )}
        </div>

        {/* Financial Details (Amount or Estimated Savings) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {reminderType === 'bank_offer' ? 'Promotional Bonus ($)' :
               reminderType === 'fee_transition' ? 'Yearly Fees Avoided ($)' :
               reminderType === 'return_warranty' ? 'Refundable Value ($)' : 'Cost / Balance ($)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
              <input
                type="number"
                step="0.01"
                placeholder={reminderType === 'bank_offer' ? '300.00' : reminderType === 'fee_transition' ? '144.00' : '14.99'}
                value={
                  reminderType === 'bank_offer' || reminderType === 'fee_transition'
                    ? (formData.estimatedSavings !== undefined && formData.estimatedSavings !== null ? formData.estimatedSavings : '')
                    : (formData.amount !== undefined && formData.amount !== null ? formData.amount : '')
                }
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  if (reminderType === 'bank_offer' || reminderType === 'fee_transition') {
                    setFormData((prev) => ({ ...prev, estimatedSavings: val }));
                  } else {
                    setFormData((prev) => ({ ...prev, amount: val }));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Currency
            </label>
            <select
              value={formData.currency || 'CAD'}
              onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer font-bold"
            >
              <option value="CAD">🇨🇦 CAD ($)</option>
              <option value="USD">🇺🇸 USD ($)</option>
              <option value="INR">🇮🇳 INR (₹)</option>
            </select>
          </div>
        </div>

        {/* Deadlines & Dates */}
        {reminderType === 'credit_card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Statement Closing Date
              </label>
              <input
                type="date"
                value={formData.statementDate || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, statementDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Payment Due Date *
              </label>
              <input
                type="date"
                value={formData.paymentDueDate || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentDueDate: e.target.value, renewalDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                required
              />
              {errors.paymentDueDate && <p className="text-[11px] text-rose-400 mt-1">{errors.paymentDueDate}</p>}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {reminderType === 'bank_offer' ? 'Bonus Requirement Deadline *' :
               reminderType === 'fee_transition' ? '1-Year Free Promo End Date *' :
               reminderType === 'return_warranty' ? 'Return Window Deadline *' : 'Renewal / Bill Date *'}
            </label>
            <input
              type="date"
              value={formData.renewalDate || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, renewalDate: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              required
            />
            {errors.renewalDate && <p className="text-[11px] text-rose-400 mt-1">{errors.renewalDate}</p>}
          </div>
        )}

        {/* Direct Link URL */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Direct Management / Cancellation Link (Optional)
          </label>
          <input
            type="url"
            placeholder="https://..."
            value={formData.actionUrl || formData.url || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, actionUrl: e.target.value, url: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
          />
        </div>

        {/* Milestone Checklist (for Bank Offer & Fee Transition) */}
        {(reminderType === 'bank_offer' || reminderType === 'fee_transition') && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Action Checklist / Criteria
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {(formData.milestones || []).length} steps
              </span>
            </div>

            <div className="space-y-2">
              {(formData.milestones || []).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-300">{m.title}</span>
                  <button
                    type="button"
                    onClick={() => removeMilestone(m.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add requirement (e.g. Deposit $1,000 via payroll)..."
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); } }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addMilestone}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
        )}

        {/* Notification Schedule Chips */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Clock size={13} />
            <span>Notify & Remind Me:</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 5, 7, 14, 30].map((day) => {
              const active = remindDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleRemindDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {day} {day === 1 ? 'day' : 'days'} before
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes & Instructions */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Action Notes & Retention Strategy
          </label>
          <textarea
            placeholder="Private reminder notes, promo codes, student verification steps, customer service numbers..."
            value={formData.notes || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 min-h-[70px] resize-none"
          />
        </div>
      </div>

      {/* 3. Footer Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl cursor-pointer transition-all hover:scale-105 flex items-center gap-2"
          style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
        >
          <Check size={14} />
          <span>{isSubmitting ? 'Saving...' : submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
