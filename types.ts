export enum Role {
  OFFICER = 'OFFICER',
  SUPERVISOR = 'SUPERVISOR'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export enum Fellowship {
  Thyatira = 'Thyatira',
  Philippi = 'Philippi',
  Laodicea = 'Laodicea',
  Balance = 'Balance',
  Ephesus = 'Ephesus',
  Smyrna = 'Smyrna',
  Sardis = 'Sardis',
  Pergamos = 'Pergamos',
  Berea = 'Berea',
  Philadelphia = 'Philadelphia'
}

export const FELLOWSHIP_PASTORS: Record<Fellowship, string> = {
  [Fellowship.Thyatira]: 'Ps Francis',
  [Fellowship.Philippi]: 'Ps Carismond',
  [Fellowship.Laodicea]: 'Ps Nathaniel',
  [Fellowship.Balance]: 'Ps Brandon',
  [Fellowship.Ephesus]: 'Senior Prophet Moses',
  [Fellowship.Smyrna]: 'Ps Collins',
  [Fellowship.Sardis]: 'Ps Jamil',
  [Fellowship.Pergamos]: 'Ps Daniel',
  [Fellowship.Berea]: 'Ps Dominic',
  [Fellowship.Philadelphia]: 'Ps Elisha'
};

export interface Member {
  id: string;
  name: string;
  phone: string;
  fellowship: Fellowship;
  status: 'ACTIVE' | 'PROVISIONAL';
  lastGiftDate?: string;
  ytdTotal: number;
}

export enum PaymentMethod {
  CASH = 'CASH',
  MOMO = 'MOMO',
  CHECK = 'CHECK'
}

export interface Transaction {
  id: string;
  batchId: string;
  memberId: string;
  memberName: string; // Denormalized for display speed
  fellowship: string;
  amount: number;
  method: PaymentMethod;
  timestamp: string; // ISO string
  officerId: string;
}

export interface Batch {
  id: string;
  date: string;
  status: 'OPEN' | 'COUNTING' | 'FINALIZED' | 'SYNCED';
  totalSystem: number;
  totalCash: number;
  variance: number;
  finalizedBy?: string;
}

export interface CashCount {
  g50: number;
  g20: number;
  g10: number;
  g5: number;
  g2: number;
  g1: number;
}
