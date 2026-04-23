import { create } from 'zustand';
import { User, Role, Member, Transaction, Batch, Fellowship, PaymentMethod } from './types';
import { supabase } from './lib/supabaseClient';

// --- Auth Store ---
// --- Auth Store ---
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!password) throw new Error("Password is required");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned");

      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // If no profile exists yet (first login?), create one or default to OFFICER
      // For now, we assume profile should exist or we use default.
      // If admin@tbc.com doesn't have a profile, we might be stuck.
      // Let's degrade gracefully.

      const role = profileData?.role as Role || (email.includes('admin') ? Role.SUPERVISOR : Role.OFFICER);

      // Hardcode name for Admin as requested
      const displayName = (authData.user.email === 'admin@tbc.com') ? 'Phebe' : (authData.user.user_metadata?.name || profileData?.email?.split('@')[0] || email.split('@')[0]);

      const user: User = {
        id: authData.user.id,
        email: authData.user.email || email,
        name: displayName,
        role,
        avatarUrl: authData.user.user_metadata?.avatar_url || profileData?.avatar_url
      };

      set({ isAuthenticated: true, user, isLoading: false });
    } catch (err: any) {
      console.error('Login error:', err);
      // Detailed error message
      set({ error: err.message || 'Failed to login', isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isAuthenticated: false, user: null, isLoading: false });
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const role = profileData?.role as Role || (session.user.email?.includes('admin') ? Role.SUPERVISOR : Role.OFFICER);

      // Hardcode name for Admin as requested
      const displayName = (session.user.email === 'admin@tbc.com') ? 'Phebe' : (session.user.user_metadata?.name || profileData?.email?.split('@')[0] || session.user.email?.split('@')[0] || 'User');

      const user: User = {
        id: session.user.id,
        email: session.user.email!,
        name: displayName,
        role,
        avatarUrl: session.user.user_metadata?.avatar_url || profileData?.avatar_url
      };

      set({ isAuthenticated: true, user, isLoading: false });
    } catch (err) {
      console.error('Check auth error:', err);
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  }
}));

// --- Data Store ---
interface DataState {
  members: Member[];
  transactions: Transaction[];
  batches: Batch[];
  activeBatchId: string;
  selectedYear: number;
  isLoading: boolean;
  error: string | null;
  setSelectedYear: (year: number) => void;
  fetchData: () => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  bulkAddTransactions: (txns: Transaction[]) => Promise<void>;
  reverseTransaction: (id: string) => Promise<void>;
  updateBatchStatus: (status: Batch['status']) => Promise<void>;
  addMember: (member: Omit<Member, 'id' | 'ytdTotal' | 'status'>) => Promise<Member | null>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  importData: (members: Member[], transactions: Transaction[]) => Promise<{ success: boolean; error?: string }>;
}

export const useDataStore = create<DataState>((set, get) => ({
  members: [],
  transactions: [],
  batches: [],
  activeBatchId: 'BATCH-CURRENT', // Default ID until loaded
  selectedYear: new Date().getFullYear(),
  isLoading: false,
  error: null,

  setSelectedYear: (year: number) => {
    set({ selectedYear: year });
    get().fetchData();
  },

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const year = get().selectedYear;

      const fetchAll = async (queryBuilder: any) => {
        let allData: any[] = [];
        let from = 0;
        const limit = 1000;
        let keepFetching = true;

        while (keepFetching) {
          const { data, error } = await queryBuilder.range(from, from + limit - 1);
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < limit) {
              keepFetching = false;
            } else {
              from += limit;
            }
          } else {
            keepFetching = false;
          }
        }
        return allData;
      };

      const membersQuery = supabase.from('members').select('*').order('name');
      const txnsQuery = supabase.from('transactions')
          .select('*')
          .gte('timestamp', `${year}-01-01T00:00:00Z`)
          .lt('timestamp', `${year + 1}-01-01T00:00:00Z`)
          .order('timestamp', { ascending: false });
      const batchesQuery = supabase.from('batches').select('*').order('date', { ascending: false });

      const [membersData, txnsData, batchesData] = await Promise.all([
        fetchAll(membersQuery),
        fetchAll(txnsQuery),
        fetchAll(batchesQuery)
      ]);

      // Ensure we have an active batch
      let rawBatches = batchesData || [];
      let activeBatchId = 'BATCH-CURRENT';

      const openBatch = rawBatches.find((b: any) => b.status === 'OPEN' || b.status === 'COUNTING');
      if (openBatch) {
        activeBatchId = openBatch.id;
      } else {
        // Create initial batch if none exists
        const newBatchId = `BATCH-${Date.now()}`;
        const newDbBatch = {
          id: newBatchId,
          date: new Date().toISOString(),
          status: 'OPEN',
          total_system: 0,
          total_cash: 0,
          variance: 0
        };
        const { error } = await supabase.from('batches').insert(newDbBatch);
        if (!error) {
          rawBatches = [newDbBatch, ...rawBatches];
          activeBatchId = newBatchId;
        } else {
          console.error("Error creating initial batch:", error);
        }
      }

      const transactions = (txnsData || []).map((t: any) => ({
        ...t,
        batchId: t.batch_id,
        memberId: t.member_id,
        memberName: t.member_name,
        officerId: t.officer_id,
        officerName: t.officer_name,
        reversalOf: t.reversal_of
      })) as Transaction[];

      set({
        members: (membersData || []).map((m: any) => {
          const memberTxns = transactions.filter(t => t.memberId === m.id);
          const ytdTotal = memberTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
          return {
            ...m,
            ytdTotal: ytdTotal,
          };
        }) as Member[],
        transactions: transactions,
        batches: rawBatches.map((b: any) => ({
          ...b,
          totalSystem: b.total_system,
          totalCash: b.total_cash,
        })) as Batch[],
        activeBatchId: activeBatchId,
        isLoading: false
      });
    } catch (err: any) {
      console.error('Error fetching data:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  addTransaction: async (txn) => {
    set({ isLoading: true });
    try {
      const dbTxn = {
        id: txn.id,
        batch_id: txn.batchId,
        member_id: txn.memberId,
        amount: txn.amount,
        method: txn.method,
        timestamp: txn.timestamp,
        officer_id: txn.officerId,
        member_name: txn.memberName,
        fellowship: txn.fellowship,
        reversal_of: txn.reversalOf
      };

      const { error } = await supabase.from('transactions').insert(dbTxn);
      if (error) throw error;

      // Re-fetch to ensure local state matches DB exactly
      await get().fetchData();
    } catch (err: any) {
      console.error('Error adding transaction:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  bulkAddTransactions: async (txns) => {
    if (txns.length === 0) return;
    set({ isLoading: true });

    try {
      const dbTxns = txns.map(txn => ({
        id: txn.id,
        batch_id: txn.batchId,
        member_id: txn.memberId,
        amount: txn.amount,
        method: txn.method,
        timestamp: txn.timestamp,
        officer_id: txn.officerId,
        member_name: txn.memberName,
        fellowship: txn.fellowship,
        reversal_of: txn.reversalOf
      }));

      const { error } = await supabase.from('transactions').insert(dbTxns);
      if (error) throw error;

      // Re-fetch to sync
      await get().fetchData();
    } catch (err: any) {
      console.error('Error adding bulk transactions:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  reverseTransaction: async (id: string) => {
    const state = get();
    const txnToReverse = state.transactions.find(t => t.id === id);
    if (!txnToReverse) return;
    if (txnToReverse.amount < 0 || txnToReverse.reversalOf) {
      throw new Error("Cannot reverse a reversal transaction.");
    }

    set({ isLoading: true });

    try {
      const reversalTxn: Transaction = {
        ...txnToReverse,
        id: crypto.randomUUID(),
        amount: -txnToReverse.amount,
        timestamp: new Date().toISOString(),
        reversalOf: txnToReverse.id
      };

      const dbReversal = {
        id: reversalTxn.id,
        batch_id: reversalTxn.batchId,
        member_id: reversalTxn.memberId,
        amount: reversalTxn.amount,
        method: reversalTxn.method,
        timestamp: reversalTxn.timestamp,
        officer_id: state.user?.id || 'sys',
        member_name: reversalTxn.memberName,
        fellowship: reversalTxn.fellowship,
        reversal_of: reversalTxn.reversalOf
      };

      const { error } = await supabase.from('transactions').insert(dbReversal);
      if (error) throw error;

      await get().fetchData();
    } catch (err: any) {
      console.error('Error reversing transaction:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateBatchStatus: async (status) => {
    const batchId = get().activeBatchId;
    set((state) => ({
      batches: state.batches.map(b => b.id === batchId ? { ...b, status } : b)
    }));

    await supabase.from('batches').update({ status }).eq('id', batchId);
  },

  addMember: async (memberData) => {
    const newMember: Member = {
      id: `MEM-${Date.now()}`,
      ...memberData,
      status: 'ACTIVE',
      ytdTotal: 0
    };

    // Optimistic
    set((state) => ({
      members: [newMember, ...state.members]
    }));

    // DB Insert
    const dbMember = {
      id: newMember.id,
      name: newMember.name,
      phone: newMember.phone,
      fellowship: newMember.fellowship,
      status: newMember.status,
      ytd_total: 0
    };

    const { error } = await supabase.from('members').insert(dbMember);
    if (error) {
      console.error('Error adding member:', error);
      return null;
    }
    return newMember;
  },

  updateMember: async (id, updates) => {
    // 1. Optimistic Update
    set((state) => {
      const updatedMembers = state.members.map(m =>
        m.id === id ? { ...m, ...updates } : m
      );

      // Update transactions if name or fellowship changed
      let updatedTransactions = state.transactions;
      if (updates.name || updates.fellowship) {
        updatedTransactions = state.transactions.map(t =>
          t.memberId === id ? {
            ...t,
            memberName: updates.name || t.memberName,
            fellowship: (updates.fellowship as Fellowship) || t.fellowship
          } : t
        );
      }

      return {
        members: updatedMembers,
        transactions: updatedTransactions
      };
    });

    // 2. DB Update
    try {
      // Update Member
      const { error: memberError } = await supabase
        .from('members')
        .update({
          name: updates.name,
          phone: updates.phone,
          fellowship: updates.fellowship,
          status: updates.status
        })
        .eq('id', id);

      if (memberError) throw memberError;

      // Note: We no longer update historical transactions when a member's name changes
      // to preserve the integrity of the original ledger records.
    } catch (err) {
      console.error('Error updating member:', err);
      set({ error: (err as any).message });
    }
  },

  deleteMember: async (id: string) => {
    try {
      // We do NOT delete members or their transactions to maintain financial integrity.
      // Instead, we mark the member as INACTIVE.
      const { error } = await supabase
        .from('members')
        .update({ status: 'PROVISIONAL' }) // Or 'INACTIVE' if we had that status
        .eq('id', id);

      if (error) throw error;

      await get().fetchData();
    } catch (err: any) {
      console.error('Error deactivating member:', err);
      set({ error: err.message });
    }
  },

  importData: async (members, transactions) => {
    try {
      set({ isLoading: true });

      // 1. Resolve Member IDs & clean up duplicates
      // Fetch fresh members to ensure we catch all duplicates
      const { data: serverMembers } = await supabase.from('members').select('*');
      const currentMembers = serverMembers || get().members;

      const nameToMembersMap = new Map<string, any[]>();
      currentMembers.forEach(m => {
        if (m.name) {
          const norm = m.name.trim().toUpperCase();
          if (!nameToMembersMap.has(norm)) nameToMembersMap.set(norm, []);
          nameToMembersMap.get(norm)!.push(m);
        }
      });

      const resolvedMembers = [];

      for (const m of members) {
        const normalizedName = m.name?.trim().toUpperCase();
        let finalId = m.id;

        if (normalizedName && nameToMembersMap.has(normalizedName)) {
          const matches = nameToMembersMap.get(normalizedName)!;
          if (matches.length > 0) {
            // Survivor is the FIRST match. We do NOT merge or delete anymore.
            const survivor = matches[0];
            finalId = survivor.id;
          }
        }
        resolvedMembers.push({ ...m, id: finalId });
      }

      // Update transactions with resolved IDs
      const resolvedTransactions = transactions.map(t => {
        const originalMember = members.find(m => m.id === t.memberId);
        if (originalMember) {
          const match = resolvedMembers.find(rm => rm.name === originalMember.name);
          if (match) return { ...t, memberId: match.id };
        }
        return t;
      });

      // 1.5 Upsert Members (only basic info)
      const dbMembers = resolvedMembers.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        fellowship: m.fellowship,
        status: m.status
        // ytd_total is intentionally omitted to avoid overwriting derived data
      }));

      const { error: memError } = await supabase.from('members').upsert(dbMembers);
      if (memError) throw memError;

      // 1.6 Upsert Batches (Fix for FK constraint)
      const uniqueBatchIds = Array.from(new Set(resolvedTransactions.map(t => t.batchId)));
      const dbBatches = uniqueBatchIds.map(bid => {
        const sampleTxn = resolvedTransactions.find(t => t.batchId === bid);
        return {
          id: bid,
          date: sampleTxn ? sampleTxn.timestamp : new Date().toISOString(),
          status: 'CLOSED',
          total_system: 0,
          total_cash: 0,
          variance: 0,
          finalized_by: 'ADMIN-IMPORT'
        };
      });

      if (dbBatches.length > 0) {
        const { error: batchError } = await supabase.from('batches').upsert(dbBatches);
        if (batchError) throw batchError;
      }

      // 2. Insert Transactions (Chunked)
      const dbTransactions = resolvedTransactions.map(t => ({
        id: t.id,
        batch_id: t.batchId,
        member_id: t.memberId,
        amount: t.amount,
        method: t.method,
        timestamp: t.timestamp,
        officer_id: t.officerId,
        member_name: t.memberName,
        fellowship: t.fellowship
      }));

      const chunkSize = 500;
      for (let i = 0; i < dbTransactions.length; i += chunkSize) {
        const chunk = dbTransactions.slice(i, i + chunkSize);
        // Using insert() instead of upsert() to prevent overwriting
        const { error: txnError } = await supabase.from('transactions').insert(chunk);
        if (txnError) {
          // If some already exist, we just log and continue or fail gracefully
          console.warn('Some transactions might already exist during import:', txnError);
          // If it's a conflict error, we might want to skip or let it throw
          if (txnError.code !== '23505') throw txnError; 
        }
      }

      // 3. Refresh State
      await get().fetchData();

      return { success: true };
    } catch (err: any) {
      console.error('Import error:', err);
      set({ isLoading: false });
      return { success: false, error: err.message };
    }
  }
}));
