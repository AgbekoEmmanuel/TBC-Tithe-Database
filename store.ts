import { create } from 'zustand';
import { User, Role, Member, Transaction, Batch, Fellowship, PaymentMethod } from './types';
import { supabase } from './lib/supabaseClient';

// --- Auth Store ---
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (email: string) => {
    const role = email.includes('supervisor') ? Role.SUPERVISOR : Role.OFFICER;
    set({
      isAuthenticated: true,
      user: {
        id: 'USR-123',
        name: email.split('@')[0],
        email,
        role
      }
    });
  },
  logout: () => set({ user: null, isAuthenticated: false })
}));

// --- Data Store ---
interface DataState {
  members: Member[];
  transactions: Transaction[];
  batches: Batch[];
  activeBatchId: string;
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  undoLastTransaction: () => void;
  updateBatchStatus: (status: Batch['status']) => Promise<void>;
  addMember: (member: Omit<Member, 'id' | 'ytdTotal' | 'status'>) => Promise<Member | null>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  importData: (members: Member[], transactions: Transaction[]) => Promise<{ success: boolean; error?: string }>;
}

export const useDataStore = create<DataState>((set, get) => ({
  members: [],
  transactions: [],
  batches: [],
  activeBatchId: 'BATCH-CURRENT', // Default ID until loaded
  isLoading: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [membersRes, txnsRes, batchesRes] = await Promise.all([
        supabase.from('members').select('*').order('name'),
        supabase.from('transactions').select('*').order('timestamp', { ascending: false }),
        supabase.from('batches').select('*').order('date', { ascending: false })
      ]);

      if (membersRes.error) throw membersRes.error;
      if (txnsRes.error) throw txnsRes.error;
      if (batchesRes.error) throw batchesRes.error;

      // Ensure we have an active batch
      let batches = batchesRes.data as Batch[];
      let activeBatchId = 'BATCH-CURRENT';

      const openBatch = batches.find(b => b.status === 'OPEN' || b.status === 'COUNTING');
      if (openBatch) {
        activeBatchId = openBatch.id;
      } else if (batches.length === 0) {
        // Create initial batch if none exists
        const newBatch: Batch = {
          id: `BATCH-${Date.now()}`,
          date: new Date().toISOString(),
          status: 'OPEN',
          totalSystem: 0,
          totalCash: 0,
          variance: 0
        };
        const { error } = await supabase.from('batches').insert(newBatch);
        if (!error) {
          batches = [newBatch];
          activeBatchId = newBatch.id;
        }
      }

      set({
        members: (membersRes.data || []).map((m: any) => ({
          ...m,
          ytdTotal: m.ytd_total || 0,
        })) as Member[],
        transactions: (txnsRes.data || []).map((t: any) => ({
          ...t,
          batchId: t.batch_id,
          memberId: t.member_id,
          memberName: t.member_name,
          officerId: t.officer_id,
        })) as Transaction[],
        batches: (batchesRes.data || []).map((b: any) => ({
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
    // Optimistic Update
    set((state) => {
      const newTxns = [txn, ...state.transactions];
      return {
        transactions: newTxns,
        members: state.members.map(m =>
          m.id === txn.memberId
            ? { ...m, ytdTotal: (m.ytdTotal || 0) + txn.amount }
            : m
        )
      };
    });

    // DB Insert
    const dbTxn = {
      id: txn.id,
      batch_id: txn.batchId,
      member_id: txn.memberId,
      amount: txn.amount,
      method: txn.method,
      timestamp: txn.timestamp,
      officer_id: txn.officerId,
      member_name: txn.memberName,
      fellowship: txn.fellowship
    };

    const { error } = await supabase.from('transactions').insert(dbTxn);
    if (error) {
      console.error('Error adding transaction:', error);
      // Revert if needed (omitted for brevity, but recommended for production)
    } else {
      // Also update member totals in DB
      const member = get().members.find(m => m.id === txn.memberId);
      if (member) {
        await supabase.from('members').update({
          ytd_total: member.ytdTotal
        }).eq('id', member.id);
      }
    }
  },

  undoLastTransaction: async () => {
    const state = get();
    const [removed, ...rest] = state.transactions;
    if (!removed) return;

    // Optimistic Revert
    set({ transactions: rest });

    // DB Delete
    const { error } = await supabase.from('transactions').delete().eq('id', removed.id);
    if (error) {
      console.error('Error undoing transaction:', error);
    } else {
      // Revert member total
      const member = state.members.find(m => m.id === removed.memberId);
      if (member) {
        await supabase.from('members').update({
          ytdTotal: Math.max(0, (member.ytdTotal || 0) - removed.amount)
          // Date revert is harder without history, ignoring for now
        }).eq('id', member.id);

        // Fix local member state too
        set(s => ({
          members: s.members.map(m => m.id === member.id ? { ...m, ytdTotal: m.ytdTotal - removed.amount } : m)
        }));
      }
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

      // Update Transactions (if needed)
      if (updates.name || updates.fellowship) {
        const txnUpdates: any = {};
        if (updates.name) txnUpdates.member_name = updates.name;
        if (updates.fellowship) txnUpdates.fellowship = updates.fellowship;

        const { error: txnError } = await supabase
          .from('transactions')
          .update(txnUpdates)
          .eq('member_id', id);

        if (txnError) throw txnError;
      }

    } catch (err) {
      console.error('Error updating member:', err);
      // Revert logic would go here
    }
  },

  importData: async (members, transactions) => {
    try {
      set({ isLoading: true });

      // 1. Upsert Members
      const dbMembers = members.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        fellowship: m.fellowship,
        status: m.status,
        ytd_total: m.ytdTotal
      }));

      const { error: memError } = await supabase.from('members').upsert(dbMembers);
      if (memError) throw memError;

      // 1.5 Upsert Batches (Fix for FK constraint)
      const uniqueBatchIds = Array.from(new Set(transactions.map(t => t.batchId)));
      const dbBatches = uniqueBatchIds.map(bid => {
        const sampleTxn = transactions.find(t => t.batchId === bid);
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
      const dbTransactions = transactions.map(t => ({
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
        const { error: txnError } = await supabase.from('transactions').upsert(chunk);
        if (txnError) throw txnError;
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
