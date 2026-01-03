import { Fellowship } from '../types';

export const FELLOWSHIP_COLORS: Record<Fellowship, { bg: string; text: string; border: string; hex: string }> = {
    [Fellowship.Thyatira]: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-100',
        hex: '#ef4444'
    },
    [Fellowship.Philippi]: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-100',
        hex: '#3b82f6'
    },
    [Fellowship.Laodicea]: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-100',
        hex: '#f97316'
    },
    [Fellowship.Balance]: {
        bg: 'bg-stone-50',
        text: 'text-stone-600',
        border: 'border-stone-200',
        hex: '#78716c'
    },
    [Fellowship.Ephesus]: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-100',
        hex: '#10b981'
    },
    [Fellowship.Smyrna]: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-100',
        hex: '#a855f7'
    },
    [Fellowship.Sardis]: {
        bg: 'bg-pink-50',
        text: 'text-pink-700',
        border: 'border-pink-100',
        hex: '#ec4899'
    },
    [Fellowship.Pergamos]: {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        border: 'border-cyan-100',
        hex: '#06b6d4'
    },
    [Fellowship.Berea]: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-100',
        hex: '#f59e0b'
    },
    [Fellowship.Philadelphia]: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-100',
        hex: '#6366f1'
    }
};

export const getFellowshipBadgeClasses = (fellowship: Fellowship | string) => {
    // Normalize string to match keys if necessary (e.g. case sensitivity), though enum values are usually strict
    // We assume the input matches the enum values or strings of them.
    const color = FELLOWSHIP_COLORS[fellowship as Fellowship];
    if (color) {
        return `${color.bg} ${color.text} border ${color.border}`;
    }
    return 'bg-slate-50 text-slate-700 border-slate-100';
};

export const getFellowshipColorHex = (fellowship: Fellowship | string): string => {
    const color = FELLOWSHIP_COLORS[fellowship as Fellowship];
    return color ? color.hex : '#94a3b8'; // Default slate-400
};
