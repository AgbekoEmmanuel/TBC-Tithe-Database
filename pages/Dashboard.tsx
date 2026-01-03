import React from 'react';
import { useDataStore } from '../store';
import {
  TrendingUp,
  Users,
  CreditCard,
  Target,
  ArrowUpRight,
  MoreHorizontal,
  Hash
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { getFellowshipColorHex } from '../lib/fellowshipColors';

export const Dashboard: React.FC = () => {
  const { transactions, members } = useDataStore();

  const YEARS = ['2024', '2025', '2026'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [velocityFilter, setVelocityFilter] = React.useState<{ month: string; year: string }>({ month: 'Jan', year: '2025' });
  const [fellowshipFilter, setFellowshipFilter] = React.useState<{ month: string; year: string }>({ month: 'Jan', year: '2025' });

  const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);
  const activeGivers = new Set(transactions.map(t => t.memberId)).size;
  const avgGift = activeGivers > 0 ? totalAmount / activeGivers : 0;

  // Format currency
  const fmt = (n: number) => `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 0 })}`;

  // --- Dynamic Data Generators ---

  // --- Dynamic Data Generators (Real Data) ---

  const getChartData = () => {
    const monthIndex = MONTHS.indexOf(velocityFilter.month);
    const year = parseInt(velocityFilter.year);

    const filtered = transactions.filter(t => {
      const d = new Date(t.timestamp);
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    });

    // Group by Week (Simple bucketing: Day 1-7 = W1, 8-14 = W2, etc.)
    const weeks = [0, 0, 0, 0, 0]; // Max 5 weeks
    filtered.forEach(t => {
      const day = new Date(t.timestamp).getDate();
      const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
      weeks[weekIdx] += t.amount;
    });

    return weeks.map((amount, i) => ({
      name: `Week ${i + 1}`,
      amount
    })).filter(w => w.amount > 0 || w.name !== 'Week 5'); // Hide Week 5 if empty
  };

  const getFellowshipData = () => {
    const monthIndex = MONTHS.indexOf(fellowshipFilter.month);
    const year = parseInt(fellowshipFilter.year);

    const filtered = transactions.filter(t => {
      const d = new Date(t.timestamp);
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    });

    // Group by Fellowship
    const totals: Record<string, number> = {};
    filtered.forEach(t => {
      const f = t.fellowship || 'Unknown';
      totals[f] = (totals[f] || 0) + t.amount;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        color: getFellowshipColorHex(name)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Return top 5
  };

  const TimeFilter = ({
    value,
    onChange
  }: {
    value: { month: string; year: string },
    onChange: (val: { month: string; year: string }) => void
  }) => (
    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-2">
      <select
        value={value.month}
        onChange={(e) => onChange({ ...value, month: e.target.value })}
        className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer pl-2"
      >
        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <div className="w-[1px] h-4 bg-slate-200"></div>
      <select
        value={value.year}
        onChange={(e) => onChange({ ...value, year: e.target.value })}
        className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer pr-2"
      >
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Top Section: KPI Cards + Main Chart */}
      <div className="flex flex-col xl:flex-row gap-8 mb-10">

        {/* KPI Cards Column */}
        <div className="xl:w-1/2 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-[#1e1e2d] mb-[-10px]">Financial Overview</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Tithe', amount: fmt(totalAmount), icon: CreditCard, color: 'text-orange-500', bg: 'bg-orange-100' },
              { label: 'Active Givers', amount: activeGivers, icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-100' },
              { label: 'Avg. Gift', amount: fmt(avgGift), icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-100' }
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-6 flex flex-col justify-between h-48 relative">
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#1e1e2d]">{stat.amount}</h3>
                  <p className="text-gray-400 font-medium text-sm mt-1">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Transactions (Feed) */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1e1e2d]">Recent Transactions</h3>
              <div className="bg-white px-4 py-2 rounded-xl text-xs font-bold text-gray-500 shadow-sm border border-gray-100">
                Real-time Feed
              </div>
            </div>

            <div className="glass-panel p-2">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 border-b border-gray-100">
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Fellowship</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3">Member</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.slice(0, 5).map((txn, i) => (
                    <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-3">
                        <span className="font-bold text-gray-700 text-xs">{txn.id.slice(-6)}</span>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">
                        {new Date(txn.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-xs font-bold" style={{ color: getFellowshipColorHex(txn.fellowship) }}>
                        {txn.fellowship}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-gray-600">{txn.method}</td>
                      <td className="px-3 py-3 text-xs font-bold text-gray-700 max-w-[160px] truncate" title={txn.memberName}>{txn.memberName}</td>
                      <td className="px-3 py-3 text-right text-emerald-500 font-bold whitespace-nowrap">GH₵{txn.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Giving Trends + Categories */}
        <div className="xl:w-1/2 flex flex-col gap-6">
          <div className="flex justify-between items-center mb-[-10px]">
            <h2 className="text-xl font-bold text-[#1e1e2d]">Giving Velocity</h2>
            <TimeFilter value={velocityFilter} onChange={setVelocityFilter} />
          </div>

          <div className="dark-card p-8 h-[320px] relative shadow-xl shadow-indigo-900/10">
            {/* Chart Decoration */}
            <div className="absolute top-8 left-8">
              <div className="text-gray-500 text-xs font-bold mb-1">High</div>
              <div className="text-gray-500 text-xs font-bold mb-1">Avg</div>
            </div>

            <div className="h-full w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()}>
                  <defs>
                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FB923C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FB923C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e2d', border: 'none', borderRadius: '12px', color: 'white' }}
                    itemStyle={{ color: '#FB923C' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#FB923C"
                    strokeWidth={3}
                    fill="url(#splitColor)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <XAxis dataKey="name" hide />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex justify-between items-center mt-2">
            <h3 className="text-xl font-bold text-[#1e1e2d]">Top Fellowships</h3>
            <TimeFilter value={fellowshipFilter} onChange={setFellowshipFilter} />
          </div>

          <div className="glass-panel p-8">
            <div className="space-y-6">
              {getFellowshipData().map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="w-32 font-bold text-gray-600 text-sm truncate">{item.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full mx-4 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.value / 12500) * 100}%`, backgroundColor: item.color }}></div>
                  </div>
                  <span className="w-16 text-right font-bold text-gray-800 text-sm">₵{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
