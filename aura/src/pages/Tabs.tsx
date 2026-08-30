import { ReceiptScannerModal } from '../components/expenses/ReceiptScannerModal';
import { Camera } from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  tabsApi, 
  type Contact, 
  type SplitNotification 
} from '../lib/tabsApi';
import { useTheme } from '../context/ThemeContext';
import { AddContactModal } from '../components/tabs/AddContactModal';
import { SplitBillModal } from '../components/tabs/SplitBillModal';
import { DirectIouModal } from '../components/tabs/DirectIouModal';
import { FriendLedgerModal } from '../components/tabs/FriendLedgerModal';
import { 
  Users, 
  UserPlus, 
  Divide, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight,
  Trash2,
  Clock,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

export default function Tabs() {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notifications, setNotifications] = useState<SplitNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owes_you' | 'you_owe' | 'settled'>('all');
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  // Modals state
  const [showAddContact, setShowAddContact] = useState(false);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [showDirectIou, setShowDirectIou] = useState(false);
  const [selectedFriendLedger, setSelectedFriendLedger] = useState<Contact | null>(null);
  const [iouInitialContactId, setIouInitialContactId] = useState<string | undefined>(undefined);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      // Background silent poll for real-time updates
      tabsApi.getSplitNotifications().then((notifs) => {
        setNotifications(notifs);
      });
      tabsApi.getContacts().then((cnts) => {
        setContacts(cnts);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [contactsList, notifsList] = await Promise.all([
        tabsApi.getContacts(),
        tabsApi.getSplitNotifications(),
      ]);
      setContacts(contactsList);
      setNotifications(notifsList);
    } catch (err) {
      console.error('Failed to load tabs data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalOwedToYou = contacts
    .filter((c: Contact) => (c.netBalance || 0) > 0)
    .reduce((sum: number, c: Contact) => sum + (c.netBalance || 0), 0);

  const totalYouOwe = contacts
    .filter((c: Contact) => (c.netBalance || 0) < 0)
    .reduce((sum: number, c: Contact) => sum + Math.abs(c.netBalance || 0), 0);

  const overallNet = totalOwedToYou - totalYouOwe;
  const currency = contacts[0]?.currency || 'CAD';

  const filteredContacts = contacts
    .filter((c: Contact) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (filterType === 'owes_you') return (c.netBalance || 0) > 0;
      if (filterType === 'you_owe') return (c.netBalance || 0) < 0;
      if (filterType === 'settled') return (c.netBalance || 0) === 0;
      return true;
    })
    .sort((a: Contact, b: Contact) => Math.abs(b.netBalance || 0) - Math.abs(a.netBalance || 0));

  const handleRespondFriendRequest = async (notif: SplitNotification, action: 'accept' | 'decline') => {
    await tabsApi.respondToFriendRequest(notif, action);
    setNotifications((prev: SplitNotification[]) => prev.filter((n: SplitNotification) => n.id !== notif.id));
    await loadAllData();
  };

  const handleRespondSplit = async (notif: SplitNotification, action: 'accept' | 'dispute') => {
    await tabsApi.respondToSplitNotification(notif, action);
    setNotifications((prev: SplitNotification[]) => prev.filter((n: SplitNotification) => n.id !== notif.id));
    await loadAllData();
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      await tabsApi.deleteContact(contactToDelete.id);
      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
      if (selectedFriendLedger?.id === contactToDelete.id) {
        setSelectedFriendLedger(null);
      }
      setContactToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-slate-100 max-w-7xl mx-auto">
      {/* Top Header Command Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-[#080808]/90 border border-zinc-800 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
          >
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              TABS // Social Bill Split & IOUs
            </h1>
            <p className="text-xs text-zinc-400">
              Split bills with roommates, track money lent or borrowed, and keep tabs clean
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowAddContact(true)}
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-[#000000] border border-zinc-700 hover:border-zinc-500 text-zinc-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus size={14} className="text-cyan-400" />
            <span>+ Add Friend</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIouInitialContactId(contacts[0]?.id);
              setShowDirectIou(true);
            }}
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-[#000000] border border-zinc-700 hover:border-zinc-500 text-zinc-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} className="text-emerald-400" />
            <span>+ Lent / Borrowed</span>
          </button>

          
          <button
            type="button"
            onClick={() => setShowReceiptScanner(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 shadow-md cursor-pointer transition-all hover:scale-105 flex items-center gap-1.5"
          >
            <Camera size={14} />
            <span>📸 Scan Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSplitBill(true)}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            <Divide size={14} />
            <span>+ Split Bill</span>
          </button>
        </div>
      </div>

      {/* Cross-User Incoming Notifications Prompt */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif: SplitNotification) => {
            const isFriendReq = notif.type === 'friend_request' || notif.amount === 0;

            return (
              <div
                key={notif.id}
                className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in slide-in-from-top-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                    {isFriendReq ? <UserCheck size={18} /> : <Sparkles size={18} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {isFriendReq
                        ? `${notif.senderName} sent you a Friend Connection Request!`
                        : `${notif.senderName} split "${notif.title}" with you`}
                    </h4>
                    <p className="text-[11px] text-cyan-300">
                      {isFriendReq
                        ? 'Connect to share expense tabs, roommate splits & personal IOUs automatically.'
                        : `Your assigned share is $${notif.amount.toFixed(2)} ${notif.currency}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {isFriendReq ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRespondFriendRequest(notif, 'decline')}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-black/40 border border-zinc-700 cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondFriendRequest(notif, 'accept')}
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Accept Request</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRespondSplit(notif, 'dispute')}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-black/40 border border-zinc-700 cursor-pointer"
                      >
                        Dispute
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondSplit(notif, 'accept')}
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Accept to My Tab</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hero Stats Matrix (Net Balance Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overall Position Card */}
        <div className={`p-5 rounded-2xl border backdrop-blur-xl shadow-xl flex flex-col justify-between ${
          overallNet > 0
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
            : overallNet < 0
            ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
            : 'bg-[#080808]/90 border-zinc-800 text-zinc-400'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Overall Net Balance</span>
            <h3 className="text-2xl md:text-3xl font-black font-mono tracking-tight mt-1">
              {overallNet > 0 ? `+$${overallNet.toFixed(2)}` : overallNet < 0 ? `-$${Math.abs(overallNet).toFixed(2)}` : '$0.00'} <span className="text-xs">{currency}</span>
            </h3>
          </div>
          <span className="text-xs font-semibold mt-3 block opacity-85">
            {overallNet > 0 ? '🟢 You are in the green (money to collect)' : overallNet < 0 ? '🔴 You owe money to friends' : '⚪ All tabs are settled up!'}
          </span>
        </div>

        {/* Total Owed To You */}
        <div className="p-5 rounded-2xl bg-[#080808]/90 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center gap-1">
              <ArrowUpRight size={13} /> Friends Owe You (Lent / Splits)
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight text-white mt-1">
              +${totalOwedToYou.toFixed(2)} <span className="text-xs text-zinc-400">{currency}</span>
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            Across {contacts.filter((c: Contact) => (c.netBalance || 0) > 0).length} friends
          </p>
        </div>

        {/* Total You Owe */}
        <div className="p-5 rounded-2xl bg-[#080808]/90 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block flex items-center gap-1">
              <ArrowDownLeft size={13} /> You Owe Friends (Borrowed)
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight text-white mt-1">
              -${totalYouOwe.toFixed(2)} <span className="text-xs text-zinc-400">{currency}</span>
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            Across {contacts.filter((c: Contact) => (c.netBalance || 0) < 0).length} friends
          </p>
        </div>
      </div>

      {/* Friends & Roommates Directory Section */}
      <div className="space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="p-3 rounded-2xl bg-[#080808]/90 border border-zinc-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search friends by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {(['all', 'owes_you', 'you_owe', 'settled'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  filterType === tab
                    ? 'bg-zinc-800 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-white bg-transparent'
                }`}
              >
                {tab === 'all' && `All (${contacts.length})`}
                {tab === 'owes_you' && 'Owes You'}
                {tab === 'you_owe' && 'You Owe'}
                {tab === 'settled' && 'Settled'}
              </button>
            ))}
          </div>
        </div>

        {/* Contacts Cards Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500 font-mono">Loading your friends and tabs...</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#080808]/50 border border-zinc-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-cyan-400 flex items-center justify-center mx-auto shadow-xl">
              <Users size={26} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Friends or Roommates Added Yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Add roommates or friends to split groceries, dinners, rent, or track money you lend and borrow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddContact(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105 inline-flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <UserPlus size={14} />
              <span>+ Add First Friend</span>
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#080808]/50 border border-zinc-800 text-center text-xs text-zinc-400">
            No contacts found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact: Contact) => {
              const net = contact.netBalance || 0;
              const isOwed = net > 0;
              const isDebt = net < 0;

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedFriendLedger(contact)}
                  className="p-5 rounded-2xl bg-[#080808]/90 border border-zinc-800 backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-zinc-600 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: isOwed ? '#10b981' : isDebt ? '#f43f5e' : '#3f3f46' }}
                  />

                  <div>
                    {/* Top Row: Avatar & Status */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contact.name)}&backgroundColor=transparent`}
                          alt={contact.name}
                          className="w-10 h-10 rounded-xl bg-[#000000] border border-zinc-800"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">
                              {contact.name}
                            </h4>
                            {contact.status === 'connected' ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5" title="Connected Aura Member">
                                <ShieldCheck size={10} /> Connected
                              </span>
                            ) : contact.status === 'pending' ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5" title="Friend Request Sent">
                                <Clock size={10} /> Req Sent
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11px] text-zinc-400 truncate block max-w-[180px]">
                            {contact.email || contact.phone || (contact.status === 'connected' ? 'Aura Connected Friend' : contact.status === 'pending' ? 'Aura Request Pending' : 'Personal Contact')}
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </div>

                    {/* Big Running Net Balance Badge */}
                    <div className={`p-3 rounded-xl border mt-2 flex justify-between items-center ${
                      isOwed
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : isDebt
                        ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        : 'bg-[#000000] border-zinc-800/80 text-zinc-400'
                    }`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        {isOwed ? 'Owes you' : isDebt ? 'You owe' : 'Settled up'}
                      </span>
                      <span className="font-mono font-black text-sm">
                        {isOwed ? '+' : isDebt ? '-' : ''}${Math.abs(net).toFixed(2)} {contact.currency || currency}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContactToDelete(contact);
                      }}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete friend & remove tabs"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIouInitialContactId(contact.id);
                          setShowDirectIou(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#000000] hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-300 transition-colors cursor-pointer"
                      >
                        + IOU
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFriendLedger(contact);
                        }}
                        className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-white transition-colors cursor-pointer"
                      >
                        View Ledger
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[#080808] border border-rose-900/50 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Delete Friend & Tabs?</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to remove <strong className="text-white">{contactToDelete.name}</strong>? All associated split bills, IOUs, and tab records with them will also be deleted.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteContact}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD CONTACT */}
      {showReceiptScanner && (
        <ReceiptScannerModal 
          onClose={() => setShowReceiptScanner(false)}
          onReceiptProcessed={() => {
            setShowReceiptScanner(false);
            loadAllData();
          }}
        />
      )}
      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onContactAdded={(newC: Contact) => {
            setContacts((prev: Contact[]) => [...prev, newC]);
          }}
        />
      )}

      {/* MODAL 2: SPLIT BILL */}
      {showSplitBill && (
        <SplitBillModal
          contacts={contacts}
          onClose={() => setShowSplitBill(false)}
          onSplitCreated={() => {
            loadAllData();
          }}
          onOpenAddContact={() => {
            setShowSplitBill(false);
            setShowAddContact(true);
          }}
        />
      )}

      {/* MODAL 3: DIRECT IOU */}
      {showDirectIou && (
        <DirectIouModal
          contacts={contacts}
          initialContactId={iouInitialContactId}
          onClose={() => setShowDirectIou(false)}
          onIouCreated={() => {
            loadAllData();
          }}
          onOpenAddContact={() => {
            setShowDirectIou(false);
            setShowAddContact(true);
          }}
        />
      )}

      {/* MODAL 4: DETAILED FRIEND LEDGER */}
      {selectedFriendLedger && (
        <FriendLedgerModal
          contact={selectedFriendLedger}
          onClose={() => setSelectedFriendLedger(null)}
          onOpenSplit={() => {
            setShowSplitBill(true);
          }}
          onOpenIou={() => {
            setIouInitialContactId(selectedFriendLedger.id);
            setShowDirectIou(true);
          }}
          onDeleteFriend={() => {
            setContactToDelete(selectedFriendLedger);
            setSelectedFriendLedger(null);
          }}
          onDataUpdated={() => {
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
