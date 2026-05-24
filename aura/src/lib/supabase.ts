import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Comprehensive Local Storage Mock of Supabase Client
class MockSupabaseClient {
  auth = {
    async getSession() {
      const userStr = localStorage.getItem('aura_mock_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return { data: { session: { user, access_token: 'mock-token' } }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange(callback: any) {
      const handleStorage = () => {
        const userStr = localStorage.getItem('aura_mock_user');
        const session = userStr ? { user: JSON.parse(userStr), access_token: 'mock-token' } : null;
        callback('SIGNED_IN', session);
      };
      window.addEventListener('storage', handleStorage);
      
      // Fire immediately
      const userStr = localStorage.getItem('aura_mock_user');
      const session = userStr ? { user: JSON.parse(userStr), access_token: 'mock-token' } : null;
      setTimeout(() => callback('INITIAL_SESSION', session), 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => window.removeEventListener('storage', handleStorage)
          }
        }
      };
    },
    async signInWithPassword({ email }: any) {
      const user = { id: 'sandbox-monarch-id', email, user_metadata: { name: email.split('@')[0] } };
      localStorage.setItem('aura_mock_user', JSON.stringify(user));
      localStorage.setItem('aura_sandbox_mode', 'true');
      window.dispatchEvent(new Event('storage'));
      return { data: { user, session: { user, access_token: 'mock-token' } }, error: null };
    },
    async signUp({ email }: any) {
      const user = { id: 'sandbox-monarch-id', email, user_metadata: { name: email.split('@')[0] } };
      localStorage.setItem('aura_mock_user', JSON.stringify(user));
      localStorage.setItem('aura_sandbox_mode', 'true');
      window.dispatchEvent(new Event('storage'));
      return { data: { user, session: { user, access_token: 'mock-token' } }, error: null };
    },
    async signInWithOAuth({ provider }: any) {
      const user = { id: 'sandbox-monarch-id', email: 'monarch@aura.local', user_metadata: { name: `${provider.toUpperCase()} Monarch` } };
      localStorage.setItem('aura_mock_user', JSON.stringify(user));
      localStorage.setItem('aura_sandbox_mode', 'true');
      window.dispatchEvent(new Event('storage'));
      return { data: { user, session: { user, access_token: 'mock-token' } }, error: null };
    },
    async signOut() {
      localStorage.removeItem('aura_mock_user');
      window.dispatchEvent(new Event('storage'));
      return { error: null };
    }
  };

  from(table: string) {
    const getLocalData = (): any[] => {
      const data = localStorage.getItem(`aura_mock_db_${table}`);
      return data ? JSON.parse(data) : [];
    };
    const setLocalData = (data: any[]) => {
      localStorage.setItem(`aura_mock_db_${table}`, JSON.stringify(data));
    };

    return {
      select(_columns: string = '*') {
        let data = getLocalData();
        const chain = {
          eq(field: string, value: any) {
            // Support checking user_id = null for unassigned alerts
            if (value === null) {
              data = data.filter(item => item[field] === null || item[field] === undefined);
            } else {
              data = data.filter(item => item[field] === value);
            }
            return chain;
          },
          in(field: string, values: any[]) {
            data = data.filter(item => values.includes(item[field]));
            return chain;
          },
          single() {
            return Promise.resolve({ data: data[0] || null, error: null });
          },
          order(field: string, { ascending = true } = {}) {
            data = [...data].sort((a, b) => {
              const valA = a[field];
              const valB = b[field];
              if (valA < valB) return ascending ? -1 : 1;
              if (valA > valB) return ascending ? 1 : -1;
              return 0;
            });
            return Promise.resolve({ data, error: null });
          },
          then(resolve: any) {
            return Promise.resolve({ data, error: null }).then(resolve);
          }
        };
        return chain;
      },
      delete() {
        let data = getLocalData();
        const chain = {
          eq(field: string, value: any) {
            if (value === null) {
              data = data.filter(item => item[field] !== null && item[field] !== undefined);
            } else {
              data = data.filter(item => item[field] !== value);
            }
            setLocalData(data);
            return Promise.resolve({ data, error: null });
          },
          in(field: string, values: any[]) {
            data = data.filter(item => !values.includes(item[field]));
            setLocalData(data);
            return Promise.resolve({ data, error: null });
          },
          then(resolve: any) {
            return Promise.resolve({ data, error: null }).then(resolve);
          }
        };
        return chain;
      },
      update(values: any) {
        let data = getLocalData();
        const chain = {
          eq(field: string, value: any) {
            data = data.map(item => {
              if (item[field] === value) {
                return { ...item, ...values };
              }
              return item;
            });
            setLocalData(data);
            return Promise.resolve({ data, error: null });
          },
          then(resolve: any) {
            return Promise.resolve({ data, error: null }).then(resolve);
          }
        };
        return chain;
      },
      insert(payload: any | any[]) {
        let data = getLocalData();
        const payloads = Array.isArray(payload) ? payload : [payload];

        payloads.forEach(item => {
          let matchIndex = -1;
          if (table === 'transactions' || table === 'pending_sms') {
            matchIndex = data.findIndex(d => d.transaction_id === item.transaction_id);
          } else {
            matchIndex = data.findIndex(d => d.id === item.id);
          }

          if (matchIndex > -1) {
            data[matchIndex] = { ...data[matchIndex], ...item };
          } else {
            if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
            data.push(item);
          }
        });

        setLocalData(data);
        return Promise.resolve({ data: payloads, error: null });
      },
      upsert(payload: any | any[], _options?: any) {
        let data = getLocalData();
        const payloads = Array.isArray(payload) ? payload : [payload];

        payloads.forEach(item => {
          let matchIndex = -1;
          if (table === 'transactions' || table === 'pending_sms') {
            matchIndex = data.findIndex(d => d.transaction_id === item.transaction_id);
          } else if (table === 'budgets') {
            matchIndex = data.findIndex(d => d.category === item.category && d.user_id === item.user_id);
          } else {
            matchIndex = data.findIndex(d => d.id === item.id);
          }

          if (matchIndex > -1) {
            data[matchIndex] = { ...data[matchIndex], ...item };
          } else {
            if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
            data.push(item);
          }
        });

        setLocalData(data);
        return Promise.resolve({ data: payloads, error: null });
      }
    };
  }
}

// Automatically fall back to local Sandbox Mode if env vars are placeholders/missing or local mode is explicitly toggled.
const useRealSupabase = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase') &&
  localStorage.getItem('aura_sandbox_mode') !== 'true';

export const supabase = useRealSupabase 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : (new MockSupabaseClient() as any);

