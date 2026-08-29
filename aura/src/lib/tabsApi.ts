import { supabase } from './supabase';

export type ContactStatus = 'unregistered' | 'pending' | 'connected' | 'rejected';
export type DebtType = 'split_share' | 'lent' | 'borrowed' | 'settlement';
export type DebtStatus = 'pending' | 'accepted' | 'disputed' | 'settled';

export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contactUserId?: string | null;
  status: ContactStatus;
  avatarUrl?: string | null;
  netBalance?: number;
  currency?: string;
  createdAt: string;
}

export interface SplitParticipant {
  contactId: string;
  name: string;
  shareAmount: number;
}

export interface SplitBill {
  id: string;
  creatorUserId?: string;
  title: string;
  totalAmount: number;
  currency: string;
  category: string;
  date: string;
  payerType: string;
  splitType: 'equal' | 'exact' | 'percentage';
  participants?: SplitParticipant[];
  createdAt: string;
}

export interface DebtEntry {
  id: string;
  contactId: string;
  splitBillId?: string | null;
  description: string;
  amount: number;
  currency: string;
  date: string;
  type: DebtType;
  status: DebtStatus;
  disputeReason?: string | null;
  createdAt: string;
}

export interface SplitNotification {
  id: string;
  recipientUserId: string;
  senderUserId: string;
  senderName: string;
  debtEntryId?: string | null;
  title: string;
  amount: number;
  currency: string;
  type?: 'split_bill' | 'friend_request';
  status: 'unread' | 'accepted' | 'disputed' | 'rejected';
  createdAt: string;
}

const LOCAL_STORAGE_CONTACTS_KEY = 'aura_social_contacts';
const LOCAL_STORAGE_DEBTS_KEY = 'aura_social_debts';
const LOCAL_STORAGE_SPLITS_KEY = 'aura_social_splits';

function getStorageKey(baseKey: string, userId?: string): string {
  return userId ? `${baseKey}_${userId}` : `${baseKey}_guest`;
}

export const tabsApi = {
  // 1. Search for registered Aura users by email or name
  async searchAuraUser(query: string): Promise<{ id: string; name: string; email: string; avatarUrl?: string } | null> {
    if (!query || query.trim().length < 2) return null;
    const cleanQuery = query.trim().toLowerCase();

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;

    try {
      let q = supabase
        .from('profiles')
        .select('id, name, email')
        .or(`email.ilike.${cleanQuery},name.ilike.${cleanQuery}`);

      if (currentUserId) {
        q = q.neq('id', currentUserId);
      }

      const { data, error } = await q.limit(1).maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=transparent`
        };
      }
    } catch (e) {
      console.warn('Aura user lookup warning:', e);
    }
    return null;
  },

  // 2. Fetch Contacts with Net Balances
  async getContacts(): Promise<Contact[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const key = getStorageKey(LOCAL_STORAGE_CONTACTS_KEY, user?.id);

    let contacts: Contact[] = [];

    if (user?.id && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (!error && data) {
          contacts = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            contactUserId: c.contact_user_id,
            status: c.status || 'unregistered',
            avatarUrl: c.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}&backgroundColor=transparent`,
            createdAt: c.created_at,
          }));
        }
      } catch (e) {
        console.warn('Supabase getContacts fallback:', e);
      }
    }

    if (contacts.length === 0) {
      const local = localStorage.getItem(key);
      contacts = local ? JSON.parse(local) : [];
    }

    // Attach computed running balances from debts
    const debts = await this.getDebtEntries();
    const contactsWithBalances = contacts.map((contact) => {
      const contactDebts = debts.filter((d) => d.contactId === contact.id && d.status !== 'settled');
      const net = contactDebts.reduce((sum, d) => sum + d.amount, 0);
      const mainCurrency = contactDebts[0]?.currency || 'CAD';
      return {
        ...contact,
        netBalance: Math.round(net * 100) / 100,
        currency: mainCurrency,
      };
    });

    return contactsWithBalances;
  },

  // 3. Create or Add Contact & Dispatch Friend Request
  async createContact(input: { name: string; email?: string; phone?: string; contactUserId?: string; status?: ContactStatus }): Promise<Contact> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const key = getStorageKey(LOCAL_STORAGE_CONTACTS_KEY, user?.id);

    const initialStatus: ContactStatus = input.contactUserId ? 'pending' : (input.status || 'unregistered');

    const newContact: Contact = {
      id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      contactUserId: input.contactUserId || null,
      status: initialStatus,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.name)}&backgroundColor=transparent`,
      netBalance: 0,
      currency: 'CAD',
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase
    if (user?.id && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        const { error: insertContactErr } = await supabase.from('contacts').insert({
          id: newContact.id,
          user_id: user.id,
          contact_user_id: newContact.contactUserId,
          name: newContact.name,
          email: newContact.email,
          phone: newContact.phone,
          status: newContact.status,
          avatar_url: newContact.avatarUrl,
          created_at: newContact.createdAt,
        });

        if (insertContactErr) {
          console.error('Insert contact error:', insertContactErr);
        }

        // If this contact is an Aura user, dispatch friend request notification!
        if (newContact.contactUserId) {
          const senderName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Aura Member';
          const { error: notifErr } = await supabase.from('split_notifications').insert({
            id: 'notif_fr_' + Date.now(),
            recipient_user_id: newContact.contactUserId,
            sender_user_id: user.id,
            sender_name: senderName,
            title: 'Friend Connection Request',
            amount: 0,
            currency: 'CAD',
            type: 'friend_request',
            status: 'unread',
            created_at: new Date().toISOString(),
          });

          if (notifErr) {
            console.error('Insert notification error:', notifErr);
          }
        }
      } catch (e) {
        console.warn('Supabase createContact fallback:', e);
      }
    }

    // Save local
    const local = localStorage.getItem(key);
    const list = local ? JSON.parse(local) : [];
    list.push(newContact);
    localStorage.setItem(key, JSON.stringify(list));

    return newContact;
  },

  // 4. Delete Contact and Associated Debts
  async deleteContact(id: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const contactsKey = getStorageKey(LOCAL_STORAGE_CONTACTS_KEY, user?.id);
    const debtsKey = getStorageKey(LOCAL_STORAGE_DEBTS_KEY, user?.id);

    if (user?.id && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        await supabase.from('debt_entries').delete().eq('contact_id', id).eq('user_id', user.id);
        await supabase.from('contacts').delete().eq('id', id).eq('user_id', user.id);
      } catch (e) {
        console.warn('Supabase deleteContact warning:', e);
      }
    }

    const localContacts = localStorage.getItem(contactsKey);
    if (localContacts) {
      const filtered = JSON.parse(localContacts).filter((c: Contact) => c.id !== id);
      localStorage.setItem(contactsKey, JSON.stringify(filtered));
    }

    const localDebts = localStorage.getItem(debtsKey);
    if (localDebts) {
      const filteredDebts = JSON.parse(localDebts).filter((d: DebtEntry) => d.contactId !== id);
      localStorage.setItem(debtsKey, JSON.stringify(filteredDebts));
    }
  },

  // 5. Fetch Debt Entries
  async getDebtEntries(contactId?: string): Promise<DebtEntry[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const key = getStorageKey(LOCAL_STORAGE_DEBTS_KEY, user?.id);

    let debts: DebtEntry[] = [];

    if (user?.id && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        let query = supabase.from('debt_entries').select('*').eq('user_id', user.id);
        if (contactId) {
          query = query.eq('contact_id', contactId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
          debts = data.map((d: any) => ({
            id: d.id,
            contactId: d.contact_id,
            splitBillId: d.split_bill_id,
            description: d.description,
            amount: Number(d.amount),
            currency: d.currency || 'CAD',
            date: d.date,
            type: d.type,
            status: d.status,
            disputeReason: d.dispute_reason,
            createdAt: d.created_at,
          }));
        }
      } catch (e) {
        console.warn('Supabase getDebtEntries fallback:', e);
      }
    }

    if (debts.length === 0) {
      const local = localStorage.getItem(key);
      const all: DebtEntry[] = local ? JSON.parse(local) : [];
      debts = contactId ? all.filter((d) => d.contactId === contactId) : all;
    }

    return debts;
  },

  // 6. Create N-Way Bill Split
  async createSplitBill(input: {
    title: string;
    totalAmount: number;
    currency?: string;
    category?: string;
    date?: string;
    participants: { contactId: string; name: string; shareAmount: number }[];
    payerType?: string;
  }): Promise<SplitBill> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const userKey = user?.id;

    const splitId = 'spl_' + Date.now();
    const cur = input.currency || 'CAD';
    const splitDate = input.date || new Date().toISOString().split('T')[0];

    const splitBill: SplitBill = {
      id: splitId,
      creatorUserId: userKey,
      title: input.title,
      totalAmount: input.totalAmount,
      currency: cur,
      category: input.category || 'Groceries',
      date: splitDate,
      payerType: input.payerType || 'you',
      splitType: 'equal',
      participants: input.participants,
      createdAt: new Date().toISOString(),
    };

    const debtEntries: DebtEntry[] = [];
    const friendParticipants = input.participants.filter((p) => p.contactId !== 'you');
    const allContacts = await this.getContacts();

    for (const p of friendParticipants) {
      const entry: DebtEntry = {
        id: 'dbt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        contactId: p.contactId,
        splitBillId: splitId,
        description: `${input.title} (Split Share)`,
        amount: Math.abs(p.shareAmount),
        currency: cur,
        date: splitDate,
        type: 'split_share',
        status: 'accepted',
        createdAt: new Date().toISOString(),
      };
      debtEntries.push(entry);

      const matchedContact = allContacts.find((c) => c.id === p.contactId);
      if (matchedContact?.contactUserId && userKey) {
        try {
          const senderName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Aura Member';
          await supabase.from('split_notifications').insert({
            id: 'notif_sp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            recipient_user_id: matchedContact.contactUserId,
            sender_user_id: userKey,
            sender_name: senderName,
            debt_entry_id: entry.id,
            title: input.title,
            amount: p.shareAmount,
            currency: cur,
            type: 'split_bill',
            status: 'unread',
            created_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Split notification dispatch warning:', e);
        }
      }
    }

    if (userKey && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        await supabase.from('split_bills').insert({
          id: splitBill.id,
          creator_user_id: userKey,
          title: splitBill.title,
          total_amount: splitBill.totalAmount,
          currency: splitBill.currency,
          category: splitBill.category,
          date: splitBill.date,
          payer_type: splitBill.payerType,
          split_type: splitBill.splitType,
          created_at: splitBill.createdAt,
        });

        if (debtEntries.length > 0) {
          await supabase.from('debt_entries').insert(
            debtEntries.map((d) => ({
              id: d.id,
              user_id: userKey,
              contact_id: d.contactId,
              split_bill_id: d.splitBillId,
              description: d.description,
              amount: d.amount,
              currency: d.currency,
              date: d.date,
              type: d.type,
              status: d.status,
              created_at: d.createdAt,
            }))
          );
        }
      } catch (e) {
        console.warn('Supabase createSplitBill error:', e);
      }
    }

    const debtsKey = getStorageKey(LOCAL_STORAGE_DEBTS_KEY, userKey);
    const currentDebts: DebtEntry[] = JSON.parse(localStorage.getItem(debtsKey) || '[]');
    localStorage.setItem(debtsKey, JSON.stringify([...debtEntries, ...currentDebts]));

    const splitsKey = getStorageKey(LOCAL_STORAGE_SPLITS_KEY, userKey);
    const currentSplits: SplitBill[] = JSON.parse(localStorage.getItem(splitsKey) || '[]');
    localStorage.setItem(splitsKey, JSON.stringify([splitBill, ...currentSplits]));

    return splitBill;
  },

  // 7. Direct IOU
  async createDirectIou(input: {
    contactId: string;
    description: string;
    amount: number;
    currency?: string;
    date?: string;
    type: 'lent' | 'borrowed';
  }): Promise<DebtEntry> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const userKey = user?.id;

    const finalAmount = input.type === 'lent' ? Math.abs(input.amount) : -Math.abs(input.amount);
    const entryDate = input.date || new Date().toISOString().split('T')[0];

    const entry: DebtEntry = {
      id: 'dbt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      contactId: input.contactId,
      description: input.description,
      amount: finalAmount,
      currency: input.currency || 'CAD',
      date: entryDate,
      type: input.type,
      status: 'accepted',
      createdAt: new Date().toISOString(),
    };

    if (userKey && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        await supabase.from('debt_entries').insert({
          id: entry.id,
          user_id: userKey,
          contact_id: entry.contactId,
          description: entry.description,
          amount: entry.amount,
          currency: entry.currency,
          date: entry.date,
          type: entry.type,
          status: entry.status,
          created_at: entry.createdAt,
        });
      } catch (e) {
        console.warn('Supabase createDirectIou error:', e);
      }
    }

    const debtsKey = getStorageKey(LOCAL_STORAGE_DEBTS_KEY, userKey);
    const currentDebts: DebtEntry[] = JSON.parse(localStorage.getItem(debtsKey) || '[]');
    localStorage.setItem(debtsKey, JSON.stringify([entry, ...currentDebts]));

    return entry;
  },

  // 8. Settle Up
  async settleUpDebt(input: {
    contactId: string;
    amount: number;
    currency?: string;
    notes?: string;
  }): Promise<DebtEntry> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const userKey = user?.id;

    const entry: DebtEntry = {
      id: 'dbt_' + Date.now() + '_stl',
      contactId: input.contactId,
      description: input.notes || 'Settled Balance (Repayment)',
      amount: input.amount,
      currency: input.currency || 'CAD',
      date: new Date().toISOString().split('T')[0],
      type: 'settlement',
      status: 'settled',
      createdAt: new Date().toISOString(),
    };

    if (userKey && !localStorage.getItem('aura_sandbox_mode')) {
      try {
        await supabase.from('debt_entries').insert({
          id: entry.id,
          user_id: userKey,
          contact_id: entry.contactId,
          description: entry.description,
          amount: entry.amount,
          currency: entry.currency,
          date: entry.date,
          type: entry.type,
          status: entry.status,
          created_at: entry.createdAt,
        });
      } catch (e) {
        console.warn('Supabase settleUpDebt error:', e);
      }
    }

    const debtsKey = getStorageKey(LOCAL_STORAGE_DEBTS_KEY, userKey);
    const currentDebts: DebtEntry[] = JSON.parse(localStorage.getItem(debtsKey) || '[]');
    localStorage.setItem(debtsKey, JSON.stringify([entry, ...currentDebts]));

    return entry;
  },

  // 9. Fetch Notifications with Dual-Source Discovery (split_notifications table + pending contacts)
  async getSplitNotifications(): Promise<SplitNotification[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user?.id) return [];

    const results: SplitNotification[] = [];

    // Source 1: split_notifications table
    try {
      const { data, error } = await supabase
        .from('split_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      if (!error && data) {
        for (const n of data) {
          results.push({
            id: n.id,
            recipientUserId: n.recipient_user_id,
            senderUserId: n.sender_user_id,
            senderName: n.sender_name,
            debtEntryId: n.debt_entry_id,
            title: n.title,
            amount: Number(n.amount || 0),
            currency: n.currency || 'CAD',
            type: n.type || (Number(n.amount) === 0 ? 'friend_request' : 'split_bill'),
            status: n.status,
            createdAt: n.created_at,
          });
        }
      }
    } catch (e) {
      console.warn('Notifications table query notice:', e);
    }

    // Source 2: Inverted Contact Lookup (find people who added current user with pending status)
    try {
      const { data: pendingContacts, error } = await supabase
        .from('contacts')
        .select('*, profiles:user_id(id, name, email)')
        .eq('contact_user_id', user.id)
        .eq('status', 'pending');

      if (!error && pendingContacts) {
        for (const pc of pendingContacts) {
          const senderProfile = pc.profiles;
          const senderName = senderProfile?.name || 'Aura Member';
          const senderId = pc.user_id;

          // Check if already in results
          const exists = results.some((r) => r.senderUserId === senderId && r.type === 'friend_request');
          if (!exists) {
            results.push({
              id: 'inv_fr_' + pc.id,
              recipientUserId: user.id,
              senderUserId: senderId,
              senderName: senderName,
              title: 'Friend Connection Request',
              amount: 0,
              currency: 'CAD',
              type: 'friend_request',
              status: 'unread',
              createdAt: pc.created_at,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Inverted contacts check notice:', e);
    }

    return results;
  },

  // 10. Respond to Friend Request (Accept -> Mutual Connection)
  async respondToFriendRequest(notification: SplitNotification, action: 'accept' | 'decline'): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    if (!currentUser?.id) return;

    try {
      // 1. Update split_notifications if row exists
      if (!notification.id.startsWith('inv_fr_')) {
        await supabase
          .from('split_notifications')
          .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
          .eq('id', notification.id);
      }

      if (action === 'accept') {
        // 2. Add sender to current user's contacts as 'connected'
        const existingContacts = await this.getContacts();
        let existingContact = existingContacts.find((c) => c.contactUserId === notification.senderUserId);

        if (!existingContact) {
          await this.createContact({
            name: notification.senderName,
            contactUserId: notification.senderUserId,
            status: 'connected',
          });
        } else {
          await supabase
            .from('contacts')
            .update({ status: 'connected' })
            .eq('id', existingContact.id);
        }

        // 3. Update sender's contact entry for current user to 'connected'
        await supabase
          .from('contacts')
          .update({ status: 'connected' })
          .eq('user_id', notification.senderUserId)
          .eq('contact_user_id', currentUser.id);
      } else {
        // If rejected, update sender's contact to 'rejected'
        await supabase
          .from('contacts')
          .update({ status: 'rejected' })
          .eq('user_id', notification.senderUserId)
          .eq('contact_user_id', currentUser.id);
      }
    } catch (e) {
      console.warn('respondToFriendRequest error:', e);
    }
  },

  // 11. Respond to Split Bill Notification
  async respondToSplitNotification(notification: SplitNotification, action: 'accept' | 'dispute'): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    if (!currentUser?.id) return;

    try {
      await supabase
        .from('split_notifications')
        .update({ status: action === 'accept' ? 'accepted' : 'disputed' })
        .eq('id', notification.id);

      if (action === 'accept' && notification.amount > 0) {
        const contacts = await this.getContacts();
        let senderContact = contacts.find((c) => c.contactUserId === notification.senderUserId);

        if (!senderContact) {
          senderContact = await this.createContact({
            name: notification.senderName,
            contactUserId: notification.senderUserId,
            status: 'connected',
          });
        }

        await this.createDirectIou({
          contactId: senderContact.id,
          description: `${notification.title} (Split Share)`,
          amount: notification.amount,
          currency: notification.currency,
          type: 'borrowed',
        });
      }
    } catch (e) {
      console.warn('respondToSplitNotification error:', e);
    }
  }
};
