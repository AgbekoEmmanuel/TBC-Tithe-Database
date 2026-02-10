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
        avatarUrl: profileData?.avatar_url
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
        avatarUrl: profileData?.avatar_url
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
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  undoLastTransaction: () => void;
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
          officerName: t.officer_name,
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
      officer_name: txn.officerName,
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

  deleteTransaction: async (id: string) => {
    const state = get();
    const txnToDelete = state.transactions.find(t => t.id === id);
    if (!txnToDelete) return;

    // Optimistic Update
    set((s) => ({
      transactions: s.transactions.filter(t => t.id !== id),
      members: s.members.map(m =>
        m.id === txnToDelete.memberId
          ? { ...m, ytdTotal: Math.max(0, (m.ytdTotal || 0) - txnToDelete.amount) }
          : m
      )
    }));

    // DB Delete
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting transaction:', error);
      // Revert logic (fetch data to resync)
      await get().fetchData();
    } else {
      // Sync member total in DB
      const member = state.members.find(m => m.id === txnToDelete.memberId);
      if (member) {
        // We calculate the new total based on current optimistic state (which is accurate enough locally)
        // Or better, fetch the member YTD from DB or recalc sum.
        // For simplicity, we just debit the member ytd_total in DB same as local.
        // Note: Ideally we should use an RPC or re-sum, but decrementing fits the pattern.
        // Actually, let's just update the member with the new value we calculated locally.
        const currentMember = get().members.find(m => m.id === member.id);
        if (currentMember) {
          await supabase.from('members').update({
            ytd_total: currentMember.ytdTotal
          }).eq('id', member.id);
        }
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

  deleteMember: async (id: string) => {
    // 1. Optimistic Update
    const memberToDelete = get().members.find(m => m.id === id);
    if (!memberToDelete) return;

    set((state) => ({
      members: state.members.filter(m => m.id !== id),
      // Filter out transactions for this member to keep UI sync
      transactions: state.transactions.filter(t => t.memberId !== id)
    }));

    // 2. DB Delete
    try {
      // Delete transactions first (Foreign Key Constraint usually requires this, 
      // though CASCADE might be set, it's safer to be explicit)
      const { error: txnError } = await supabase
        .from('transactions')
        .delete()
        .eq('member_id', id);

      if (txnError) throw txnError;

      // Delete Member
      const { error: memberError } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (memberError) throw memberError;

    } catch (err: any) {
      console.error('Error deleting member:', err);
      // Revert logic (simplified: fetch data again)
      await get().fetchData();
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
      const duplicateRemovalPromises: Promise<any>[] = [];

      for (const m of members) {
        const normalizedName = m.name?.trim().toUpperCase();
        let finalId = m.id;

        if (normalizedName && nameToMembersMap.has(normalizedName)) {
          const matches = nameToMembersMap.get(normalizedName)!;
          if (matches.length > 0) {
            // Survivor is the FIRST match (usually the oldest or arbitrary stable one)
            const survivor = matches[0];
            finalId = survivor.id;

            // If there are duplicates (Victims), merge and delete them
            if (matches.length > 1) {
              const victimIds = matches.slice(1).map(v => v.id);

              const cleanup = async () => {
                // 1. Reassign transactions from victims to survivor
                await supabase
                  .from('transactions')
                  .update({ member_id: survivor.id })
                  .in('member_id', victimIds);

                // 2. Delete victims
                await supabase
                  .from('members')
                  .delete()
                  .in('id', victimIds);
              };
              duplicateRemovalPromises.push(cleanup());
            }
          }
        }
        resolvedMembers.push({ ...m, id: finalId });
      }

      // Wait for cleanups to finish
      if (duplicateRemovalPromises.length > 0) {
        await Promise.all(duplicateRemovalPromises);
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

      // 1.5 Upsert Members
      const dbMembers = resolvedMembers.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        fellowship: m.fellowship,
        status: m.status,
        ytd_total: m.ytdTotal !== undefined ? m.ytdTotal : 0 // Force update from import
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

        // 1.8 Delete existing transactions for these batches to prevent duplication (Overwrite logic)
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .in('batch_id', uniqueBatchIds);

        if (deleteError) throw deleteError;
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
