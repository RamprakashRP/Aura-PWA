import { useState, useEffect } from 'react';
import { vaultApi, type Reminder, type CreateReminderInput, type UserNotificationSettings } from '../lib/vaultApi';
import { ReminderList } from '../components/vault/ReminderList';
import { ReminderForm } from '../components/vault/ReminderForm';
import { CreditCardWallet } from '../components/vault/CreditCardWallet';
import { BankMilestoneTracker } from '../components/vault/BankMilestoneTracker';
import { FeeTransitionManager } from '../components/vault/FeeTransitionManager';
import { ReturnWarrantyTracker } from '../components/vault/ReturnWarrantyTracker';
import { TelegramConnectModal } from '../components/vault/TelegramConnectModal';
import { useTheme } from '../context/ThemeContext';
import { 
  Plus, 
  Send,
  CreditCard,
  Layers,
  GraduationCap,
  Package,
  Flame,
  Calendar,
  PiggyBank
} from 'lucide-react';

type TabType = 
  | 'overview' 
  | 'credit_cards' 
  | 'bank_offers' 
  | 'fee_transitions' 
  | 'returns_warranties' 
  | 'subscriptions';

export default function Vault() {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifSettings, setNotifSettings] = useState<UserNotificationSettings>({});
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [list, notifs] = await Promise.all([
        vaultApi.getReminders(),
        vaultApi.getNotificationSettings(),
      ]);
      setReminders(list);
      setNotifSettings(notifs);
    } catch (error) {
      console.error('Failed to load vault data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReminder = async (data: CreateReminderInput) => {
    await vaultApi.createReminder(data);
    setShowCreateModal(false);
    await loadData();
  };

  const handleUpdateReminder = async (data: CreateReminderInput) => {
    if (!editingReminder) return;
    await vaultApi.updateReminder(editingReminder.id, data);
    setEditingReminder(null);
    await loadData();
  };

  const handleToggleMilestone = async (reminderId: string, milestoneId: string, completed: boolean) => {
    await vaultApi.toggleMilestone(reminderId, milestoneId, completed);
    await loadData();
  };

  const handleDeleteReminder = async (id: string) => {
    if (confirm('Are you sure you want to delete this tracked reminder?')) {
      await vaultApi.deleteReminder(id);
      await loadData();
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await vaultApi.updateReminder(id, { status });
    await loadData();
  };

  const creditCards = reminders.filter((r) => r.reminderType === 'credit_card');
  const bankOffers = reminders.filter((r) => r.reminderType === 'bank_offer');
  const feeTransitions = reminders.filter((r) => r.reminderType === 'fee_transition');
  const returnsWarranties = reminders.filter((r) => r.reminderType === 'return_warranty');
  const subscriptions = reminders.filter((r) => r.reminderType === 'subscription' || !r.reminderType);

  return (
    <div className="space-y-6 pb-24 text-slate-100 max-w-7xl mx-auto">
      {/* Top Vault Command Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #e1143d)` }}
          >
            <Flame size={22} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              VAULT // Reminder Command
            </h1>
            <p className="text-xs text-slate-400">
              Bill Due Dates • Bank Bonus Deadlines • 1-Yr Free Checking Conversions • Return Windows
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Telegram Status Button */}
          <button
            type="button"
            onClick={() => setShowTelegramModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 transition-all cursor-pointer"
            style={{
              borderColor: notifSettings.telegramChatId ? 'rgba(0, 242, 254, 0.4)' : undefined,
              color: notifSettings.telegramChatId ? '#38bdf8' : undefined,
            }}
          >
            <Send size={13} />
            <span>{notifSettings.telegramChatId ? 'Telegram Active' : 'Connect Telegram'}</span>
          </button>

          {/* Add New Entry Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white shadow-lg transition-all cursor-pointer hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            <Plus size={15} />
            <span>+ New Reminder</span>
          </button>
        </div>
      </div>

      {/* Segmented Desktop Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{ background: activeTab === 'overview' ? auraColor : 'transparent' }}
        >
          <Layers size={14} />
          <span>All Reminders ({reminders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('credit_cards')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'credit_cards' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{ background: activeTab === 'credit_cards' ? auraColor : 'transparent' }}
        >
          <CreditCard size={14} />
          <span>Card Deadlines ({creditCards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank_offers')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'bank_offers' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{ background: activeTab === 'bank_offers' ? auraColor : 'transparent' }}
        >
          <PiggyBank size={14} />
          <span>Bank Bonuses ({bankOffers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fee_transitions')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'fee_transitions' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{ background: activeTab === 'fee_transitions' ? auraColor : 'transparent' }}
        >
          <GraduationCap size={14} />
          <span>1-Yr Fee Transitions ({feeTransitions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('returns_warranties')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'returns_warranties' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{ background: activeTab === 'returns_warranties' ? auraColor : 'transparent' }}
        >
          <Package size={14} />
          <span>Return Windows ({returnsWarranties.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'subscriptions' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{ background: activeTab === 'subscriptions' ? auraColor : 'transparent' }}
        >
          <Calendar size={14} />
          <span>Subscriptions ({subscriptions.length})</span>
        </button>
      </div>

      {/* Tab Views */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 font-mono text-xs">Loading Money Saver reminders...</div>
      ) : activeTab === 'credit_cards' ? (
        <CreditCardWallet
          cards={creditCards}
          onEdit={(card) => setEditingReminder(card)}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateModal(true)}
        />
      ) : activeTab === 'bank_offers' ? (
        <BankMilestoneTracker
          offers={bankOffers}
          onToggleMilestone={handleToggleMilestone}
          onEdit={(offer) => setEditingReminder(offer)}
          onDelete={handleDeleteReminder}
          onCreateNew={() => setShowCreateModal(true)}
        />
      ) : activeTab === 'fee_transitions' ? (
        <FeeTransitionManager
          transitions={feeTransitions}
          onToggleStep={handleToggleMilestone}
          onEdit={(item) => setEditingReminder(item)}
          onDelete={handleDeleteReminder}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateModal(true)}
        />
      ) : activeTab === 'returns_warranties' ? (
        <ReturnWarrantyTracker
          items={returnsWarranties}
          onEdit={(item) => setEditingReminder(item)}
          onDelete={handleDeleteReminder}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateModal(true)}
        />
      ) : (
        <ReminderList
          reminders={activeTab === 'subscriptions' ? subscriptions : reminders}
          onEdit={(reminder) => setEditingReminder(reminder)}
          onDelete={handleDeleteReminder}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateModal(true)}
        />
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Create New Tracking Reminder</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <ReminderForm
              onSubmit={handleCreateReminder}
              onCancel={() => setShowCreateModal(false)}
              submitLabel="Save & Protect"
            />
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Edit Reminder: {editingReminder.title}</h2>
              <button
                type="button"
                onClick={() => setEditingReminder(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <ReminderForm
              initialData={{
                ...editingReminder,
                amount: editingReminder.amount ? Number(editingReminder.amount) : undefined,
                estimatedSavings: editingReminder.estimatedSavings ? Number(editingReminder.estimatedSavings) : undefined,
              }}
              onSubmit={handleUpdateReminder}
              onCancel={() => setEditingReminder(null)}
              submitLabel="Update Reminder"
            />
          </div>
        </div>
      )}

      {/* TELEGRAM CONNECT MODAL */}
      {showTelegramModal && (
        <TelegramConnectModal
          currentChatId={notifSettings.telegramChatId}
          onClose={() => setShowTelegramModal(false)}
          onSaved={(chatId) => {
            vaultApi.updateTelegramChatId(chatId);
            setNotifSettings((prev) => ({ ...prev, telegramChatId: chatId }));
          }}
        />
      )}
    </div>
  );
}
