import React, { useState } from 'react';
import { useDataStore } from '../store';
import { PaymentMethod } from '../types';
import { Calculator, CheckCircle, AlertTriangle, Lock } from 'lucide-react';

export const Reconcile: React.FC = () => {
  const { transactions } = useDataStore();

  const [counts, setCounts] = useState({
    200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });

  const systemCash = transactions
    .filter(t => t.method === PaymentMethod.CASH)
    .reduce((acc, t) => acc + t.amount, 0);

  const physicalCash = Object.entries(counts).reduce((acc, [denom, count]) => {
    return acc + (parseFloat(denom) * (count as number));
  }, 0);

  const variance = physicalCash - systemCash;
  const isBalanced = Math.abs(variance) < 0.01;

  const handleCountChange = (denom: number, val: string) => {
    const num = parseInt(val) || 0;
    setCounts(prev => ({ ...prev, [denom]: num }));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cash Reconciliation</h2>
          <p className="text-slate-500 mt-1 text-sm">Verify physical cash against system entries.</p>
        </div>
        <div className="bg-white px-5 py-2 rounded-xl shadow-sm border border-slate-100">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">System Expected Cash</span>
          <div className="text-xl font-black text-slate-800">GH₵{systemCash.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Denominations */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center mb-6 text-slate-800 font-bold text-base">
            <Calculator className="w-4 h-4 mr-2 text-indigo-600" />
            Physical Count Input
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[200, 100, 50, 20, 10, 5, 2, 1].map((denom) => (
              <div key={denom} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                <div className="font-bold text-slate-600 w-12 text-sm">GH₵{denom}</div>
                <div className="flex items-center">
                  <span className="text-[10px] text-slate-400 mr-1.5">x</span>
                  <input
                    type="number"
                    min="0"
                    className="w-20 text-right font-mono font-bold text-sm bg-white border border-slate-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={counts[denom as keyof typeof counts] || ''}
                    onChange={(e) => handleCountChange(denom, e.target.value)}
                  />
                </div>
                <div className="w-20 text-right text-xs text-slate-400 font-medium whitespace-nowrap flex justify-end items-center">
                  <span className="mr-1">=</span>
                  <span>{(denom * (counts[denom as keyof typeof counts] || 0)).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-500">Total Physical Cash</span>
            <span className="text-3xl font-black text-indigo-900">GH₵{physicalCash.toLocaleString()}</span>
          </div>
        </div>

        {/* Right: Variance & Actions */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className={`rounded-[2rem] p-8 shadow-sm text-white transition-colors ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'
            }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium opacity-80 mb-1">Reconciliation Status</p>
                <h3 className="text-3xl font-bold flex items-center">
                  {isBalanced ? (
                    <>
                      <CheckCircle className="w-8 h-8 mr-3" /> BALANCED
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-8 h-8 mr-3" /> VARIANCE
                    </>
                  )}
                </h3>
              </div>
              <div className="text-right">
                <p className="font-medium opacity-80 mb-1">Difference</p>
                <p className="text-3xl font-bold font-mono">
                  {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                </p>
              </div>
            </div>
            {!isBalanced && (
              <div className="mt-6 bg-white/20 p-4 rounded-xl text-sm font-medium">
                {variance < 0
                  ? "Shortage detected. Please recount or check for missing transaction slips."
                  : "Overage detected. Please check for unentered transactions."
                }
              </div>
            )}
          </div>

          {/* Finalize Action */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-slate-400" />
              Finalize Batch
            </h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-500 mb-2">Supervisor PIN</label>
              <input
                type="password"
                className="w-full bg-slate-50 border-none rounded-xl p-3 font-mono text-center tracking-widest text-xl"
                placeholder="••••"
                maxLength={4}
              />
            </div>
            <button
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isBalanced}
            >
              Finalize & Close Batch
            </button>
            {!isBalanced && (
              <p className="text-xs text-center text-rose-500 mt-3 font-medium">
                Cannot finalize while variance exists.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};