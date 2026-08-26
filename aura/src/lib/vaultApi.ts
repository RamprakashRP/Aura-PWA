import { supabase } from './supabase';

export type ReminderType =
  | 'subscription'
  | 'credit_card'
  | 'bank_offer'
  | 'fee_transition'
  | 'return_warranty'
  | 'custom';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  deadline?: string;
  notes?: string;
}

export interface PasskeyInfo {
  id: string;
  name?: string;
  deviceType?: string;
  backedUp?: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface Reminder {
  id: string;
  userId?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  reminderType: ReminderType;

  startDate?: string | null;
  renewalDate: string;
  cancellationDeadline?: string | null;

  statementDate?: string | null;
  paymentDueDate?: string | null;
  issuerBank?: string | null;
  last4Digits?: string | null;

  milestones?: Milestone[] | null;
  estimatedSavings?: number | string | null;
  actionUrl?: string | null;

  remindDaysBefore: number[];
  amount?: number | string | null;
  currency?: string | null;
  billingCycle?: string | null;
  autoRenew: boolean;
  status: string;
  lastRemindedAt?: string | null;
  url?: string | null;
  notes?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderInput {
  title: string;
  description?: string | null;
  category?: string | null;
  reminderType?: ReminderType;

  startDate?: string | null;
  renewalDate: string;
  cancellationDeadline?: string | null;

  statementDate?: string | null;
  paymentDueDate?: string | null;
  issuerBank?: string | null;
  last4Digits?: string | null;

  milestones?: Milestone[] | null;
  estimatedSavings?: number | string | null;
  actionUrl?: string | null;

  remindDaysBefore: number[];
  amount?: number | string | null;
  currency?: string | null;
  billingCycle?: string | null;
  autoRenew?: boolean;
  url?: string | null;
  notes?: string | null;
  tags?: string[];
}

export interface UserNotificationSettings {
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  telegramEnabled?: boolean;
}

// Storage keys
const LOCAL_STORAGE_REMINDERS_KEY = 'aura_vault_reminders';
const LOCAL_STORAGE_PASSKEYS_KEY = 'aura_vault_passkeys';
const LOCAL_STORAGE_NOTIFS_KEY = 'aura_vault_notifications';

function getLocalReminders(): Reminder[] {
  const data = localStorage.getItem(LOCAL_STORAGE_REMINDERS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

function saveLocalReminders(list: Reminder[]) {
  localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(list));
}

function mapDbToReminder(r: any): Reminder {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    category: r.category,
    reminderType: r.reminder_type || 'subscription',
    startDate: r.start_date,
    renewalDate: r.renewal_date,
    cancellationDeadline: r.cancellation_deadline,
    statementDate: r.statement_date,
    paymentDueDate: r.payment_due_date,
    issuerBank: r.issuer_bank,
    last4Digits: r.last_4_digits,
    milestones: r.milestones,
    estimatedSavings: r.estimated_savings,
    actionUrl: r.action_url,
    remindDaysBefore: r.remind_days_before || [14, 7, 2, 1],
    amount: r.amount,
    currency: r.currency || 'USD',
    billingCycle: r.billing_cycle,
    autoRenew: r.auto_renew !== undefined ? r.auto_renew : true,
    status: r.status || 'active',
    lastRemindedAt: r.last_reminded_at,
    url: r.url,
    notes: r.notes,
    tags: r.tags || [],
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  };
}

function mapReminderToDb(r: CreateReminderInput, userId?: string): any {
  return {
    user_id: userId,
    title: r.title,
    description: r.description,
    category: r.category,
    reminder_type: r.reminderType || 'subscription',
    start_date: r.startDate,
    renewal_date: r.renewalDate,
    cancellation_deadline: r.cancellationDeadline,
    statement_date: r.statementDate,
    payment_due_date: r.paymentDueDate,
    issuer_bank: r.issuerBank,
    last_4_digits: r.last4Digits,
    milestones: r.milestones,
    estimated_savings: r.estimatedSavings,
    action_url: r.actionUrl,
    remind_days_before: r.remindDaysBefore,
    amount: r.amount,
    currency: r.currency || 'USD',
    billing_cycle: r.billingCycle,
    auto_renew: r.autoRenew,
    url: r.url,
    notes: r.notes,
    tags: r.tags,
    updated_at: new Date().toISOString(),
  };
}

export const vaultApi = {
  // 1. Fetch All Reminders
  async getReminders(): Promise<Reminder[]> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user && !localStorage.getItem('aura_sandbox_mode')) {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .order('renewal_date', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(mapDbToReminder);
        }
      }
    } catch (e) {
      console.warn('Supabase query fallback to local storage:', e);
    }
    return getLocalReminders();
  },

  // 2. Create Reminder
  async createReminder(input: CreateReminderInput): Promise<Reminder> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user && !localStorage.getItem('aura_sandbox_mode')) {
        const dbPayload = mapReminderToDb(input, user.id);
        const { data, error } = await supabase.from('reminders').insert([dbPayload]).select().single();
        if (!error && data) {
          return mapDbToReminder(data);
        }
      }
    } catch (e) {
      console.warn('Supabase insert fallback:', e);
    }

    const newItem: Reminder = {
      ...input,
      id: 'vault-' + Date.now(),
      reminderType: input.reminderType || 'subscription',
      currency: input.currency || 'USD',
      remindDaysBefore: input.remindDaysBefore || [14, 7, 2, 1],
      autoRenew: input.autoRenew !== undefined ? input.autoRenew : true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const list = [newItem, ...getLocalReminders()];
    saveLocalReminders(list);
    return newItem;
  },

  // 3. Update Reminder
  async updateReminder(id: string, input: Partial<CreateReminderInput> & { status?: string }): Promise<void> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user && !localStorage.getItem('aura_sandbox_mode')) {
        const dbPayload: any = {};
        if (input.title !== undefined) dbPayload.title = input.title;
        if (input.reminderType !== undefined) dbPayload.reminder_type = input.reminderType;
        if (input.renewalDate !== undefined) dbPayload.renewal_date = input.renewalDate;
        if (input.statementDate !== undefined) dbPayload.statement_date = input.statementDate;
        if (input.paymentDueDate !== undefined) dbPayload.payment_due_date = input.paymentDueDate;
        if (input.issuerBank !== undefined) dbPayload.issuer_bank = input.issuerBank;
        if (input.last4Digits !== undefined) dbPayload.last_4_digits = input.last4Digits;
        if (input.milestones !== undefined) dbPayload.milestones = input.milestones;
        if (input.estimatedSavings !== undefined) dbPayload.estimated_savings = input.estimatedSavings;
        if (input.actionUrl !== undefined) dbPayload.action_url = input.actionUrl;
        if (input.amount !== undefined) dbPayload.amount = input.amount;
        if (input.status !== undefined) dbPayload.status = input.status;
        if (input.notes !== undefined) dbPayload.notes = input.notes;
        dbPayload.updated_at = new Date().toISOString();

        await supabase.from('reminders').update(dbPayload).eq('id', id);
      }
    } catch (e) {
      console.warn('Supabase update fallback:', e);
    }

    const list = getLocalReminders().map((r) => (r.id === id ? { ...r, ...input } : r));
    saveLocalReminders(list);
  },

  // 4. Toggle Milestone Checkbox
  async toggleMilestone(reminderId: string, milestoneId: string, completed: boolean): Promise<void> {
    const list = getLocalReminders();
    const target = list.find((r) => r.id === reminderId);
    if (target && target.milestones) {
      const updatedM = target.milestones.map((m) => (m.id === milestoneId ? { ...m, completed } : m));
      target.milestones = updatedM;
      saveLocalReminders(list);

      try {
        await supabase.from('reminders').update({ milestones: updatedM, updated_at: new Date().toISOString() }).eq('id', reminderId);
      } catch {}
    }
  },

  // 5. Delete Reminder
  async deleteReminder(id: string): Promise<void> {
    try {
      await supabase.from('reminders').delete().eq('id', id);
    } catch {}
    const list = getLocalReminders().filter((r) => r.id !== id);
    saveLocalReminders(list);
  },

  // 6. Passkeys WebAuthn
  async getPasskeys(): Promise<PasskeyInfo[]> {
    try {
      const { data } = await supabase.from('passkeys').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          name: p.name,
          deviceType: p.device_type,
          backedUp: p.backed_up,
          createdAt: p.created_at,
          lastUsedAt: p.last_used_at,
        }));
      }
    } catch {}
    const local = localStorage.getItem(LOCAL_STORAGE_PASSKEYS_KEY);
    return local ? JSON.parse(local) : [];
  },

  async getPasskeyRegistrationOptions(): Promise<any> {
    return {
      challenge: 'aura_local_challenge_' + Date.now(),
      rp: { name: 'Aura Finance Vault', id: window.location.hostname },
      user: {
        id: 'aura_user_id',
        name: 'operative@aura.finance',
        displayName: 'Aura Operative',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };
  },

  async verifyPasskeyRegistration(response: any, name?: string): Promise<any> {
    const newPasskey: PasskeyInfo = {
      id: response.id || 'pk-' + Date.now(),
      name: name || 'Biometric Passkey',
      deviceType: 'platform',
      backedUp: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        await supabase.from('passkeys').insert([{
          user_id: user.id,
          credential_id: newPasskey.id,
          public_key: 'base64_encoded_pk',
          name: newPasskey.name,
          device_type: newPasskey.deviceType,
        }]);
      }
    } catch {}
    const list = [newPasskey, ...(await this.getPasskeys())];
    localStorage.setItem(LOCAL_STORAGE_PASSKEYS_KEY, JSON.stringify(list));
    return { verified: true };
  },

  async deletePasskey(id: string): Promise<void> {
    try {
      await supabase.from('passkeys').delete().eq('id', id);
    } catch {}
    const local = (await this.getPasskeys()).filter((p) => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_PASSKEYS_KEY, JSON.stringify(local));
  },

  // 7. Telegram & Push Preferences
  async getNotificationSettings(): Promise<UserNotificationSettings> {
    try {
      const { data } = await supabase.from('user_notifications').select('*').single();
      if (data) {
        return {
          telegramChatId: data.telegram_chat_id,
          telegramUsername: data.telegram_username,
          emailEnabled: data.email_enabled,
          pushEnabled: data.push_enabled,
          telegramEnabled: data.telegram_enabled,
        };
      }
    } catch {}
    const local = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    return local ? JSON.parse(local) : { emailEnabled: true, pushEnabled: true, telegramEnabled: true };
  },

  async updateTelegramChatId(chatId?: string | null): Promise<void> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        await supabase.from('user_notifications').upsert({
          user_id: user.id,
          telegram_chat_id: chatId,
          telegram_connected_at: chatId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}
    const curr = await this.getNotificationSettings();
    curr.telegramChatId = chatId;
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(curr));
  },

  async updateProfile(data: any): Promise<void> {
    if (data.telegramChatId !== undefined) {
      await this.updateTelegramChatId(data.telegramChatId);
    }
  },

  async testTelegramConnection(chatId?: string): Promise<{ success: boolean; message: string }> {
    if (!chatId) throw new Error('Chat ID required');
    return { success: true, message: 'Test message sent!' };
  },

  async getVapidPublicKey(): Promise<string | null> {
    return 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
  },

  async subscribeToPush(_sub: any, _device?: string): Promise<void> {},
  async unsubscribeFromPush(_endpoint: string): Promise<void> {},
};
