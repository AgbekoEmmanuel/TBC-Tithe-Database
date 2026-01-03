import { create } from 'zustand';
import { User, Role, Member, Transaction, Batch, Fellowship, PaymentMethod } from './types';

// --- Mock Data Generation ---
const generateMembers = (): Member[] => {
  return Array.from({ length: 50 }).map((_, i) => ({
    id: `MEM-${i + 100}`,
    name: ['John Doe', 'Jane Smith', 'Kwame Nkrumah', 'Abena Osei', 'Kofi Annan'][i % 5] + ` ${i}`,
    phone: `024${Math.floor(1000000 + Math.random() * 9000000)}`,
    fellowship: Object.values(Fellowship)[i % Object.values(Fellowship).length],
    status: i % 10 === 0 ? 'PROVISIONAL' : 'ACTIVE',
    ytdTotal: Math.floor(Math.random() * 5000),
    lastGiftDate: new Date().toISOString()
  }));
};

const generateTransactions = (members: Member[]): Transaction[] => {
  return Array.from({ length: 20 }).map((_, i) => {
    const member = members[i % members.length];
    return {
      id: `TXN-${Date.now()}-${i}`,
      batchId: 'BATCH-001',
      memberId: member.id,
      memberName: member.name,
      fellowship: member.fellowship,
      amount: Math.floor(Math.random() * 200) + 10,
      method: [PaymentMethod.CASH, PaymentMethod.MOMO, PaymentMethod.CHECK][i % 3],
      timestamp: new Date(Date.now() - i * 300000).toISOString(),
      officerId: 'OFF-001'
    };
  });
};

const initialMembers = generateMembers();
const initialTransactions = generateTransactions(initialMembers);

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
  addTransaction: (txn: Transaction) => void;
  undoLastTransaction: () => void;
  updateBatchStatus: (status: Batch['status']) => void;
  addMember: (member: Omit<Member, 'id' | 'ytdTotal' | 'lastGiftDate' | 'status'>) => Member;
}

export const useDataStore = create<DataState>((set) => ({
  members: initialMembers,
  transactions: initialTransactions,
  batches: [
    {
      id: 'BATCH-001',
      date: new Date().toISOString(),
      status: 'OPEN',
      totalSystem: initialTransactions.reduce((acc, t) => acc + t.amount, 0),
      totalCash: 0,
      variance: 0
    }
  ],
  activeBatchId: 'BATCH-001',
  addTransaction: (txn) => set((state) => {
    const newTxns = [txn, ...state.transactions];
    return {
      transactions: newTxns,
      members: state.members.map(m =>
        m.id === txn.memberId
          ? { ...m, ytdTotal: m.ytdTotal + txn.amount, lastGiftDate: txn.timestamp }
          : m
      )
    };
  }),
  undoLastTransaction: () => set((state) => {
    const [removed, ...rest] = state.transactions;
    if (!removed) return state;
    return { transactions: rest };
  }),
  updateBatchStatus: (status) => set((state) => ({
    batches: state.batches.map(b => b.id === state.activeBatchId ? { ...b, status } : b)
  })),
  addMember: (memberData) => {
    const newMember: Member = {
      id: `MEM-${Date.now()}`,
      ...memberData,
      status: 'ACTIVE',
      ytdTotal: 0,
      lastGiftDate: null
    };
    set((state) => ({
      members: [newMember, ...state.members]
    }));
    return newMember;
  }
}));
