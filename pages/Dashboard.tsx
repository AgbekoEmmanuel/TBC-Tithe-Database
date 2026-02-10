import React from 'react';
import { useDataStore } from '../store';
import {
  TrendingUp,
  Users,
  CreditCard,
  Target,
  ArrowUpRight,
  MoreHorizontal,
  Hash,
  Crown
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
  const [overviewYear, setOverviewYear] = React.useState<string>('2025');

  // Filter transactions for Financial Overview based on selected year
  const overviewTransactions = transactions.filter(t => {
    const d = new Date(t.timestamp);
    return d.getFullYear() === parseInt(overviewYear);
  });

  const totalAmount = overviewTransactions.reduce((acc, t) => acc + t.amount, 0);
  const activeGivers = new Set(overviewTransactions.map(t => t.memberId)).size;
  const avgGift = activeGivers > 0 ? totalAmount / activeGivers : 0;

  // Highest Tither Calculation
  const memberTotals = overviewTransactions.reduce((acc, t) => {
    acc[t.memberName] = (acc[t.memberName] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const highestTither = Object.entries(memberTotals).sort(([, a], [, b]) => b - a)[0] || ['None', 0];

  // Get Top Giver's fellowship
  const topGiverMember = members.find(m => m.name === highestTither[0]);
  const topGiverFellowship = topGiverMember?.fellowship || 'Unknown';

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
      .slice(0, 3); // Return top 3
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
    <div className="animate-fade-in overflow-x-hidden w-full">
      {/* Top Section: KPI Cards + Main Chart */}
      <div className="flex flex-col xl:flex-row gap-8 mb-10">

        {/* KPI Cards Column */}
        <div className="xl:w-1/2 flex flex-col gap-6">
          <div className="flex justify-between items-center mb-[-10px]">
            <h2 className="text-xl font-bold text-[#1e1e2d]">Financial Overview</h2>
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center">
              <select
                value={overviewYear}
                onChange={(e) => setOverviewYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer px-2"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6">
            {[
              { label: 'Total Tithe', amount: fmt(totalAmount), icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50 ring-1 ring-orange-100', shadow: 'shadow-orange-100' },
              { label: 'Active Givers', amount: activeGivers, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50 ring-1 ring-cyan-100', shadow: 'shadow-cyan-100' },
              { label: 'Avg. Tithe', amount: fmt(avgGift), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 ring-1 ring-purple-100', shadow: 'shadow-purple-100' },
              { label: 'Top Giver', amount: fmt(highestTither[1] as number), topGiverName: highestTither[0] as string, topGiverFellowship: topGiverFellowship, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50 ring-1 ring-amber-100', shadow: 'shadow-amber-100', isTopGiver: true }
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl md:rounded-3xl p-2 md:p-4 relative transition-all duration-300 hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1 border border-slate-100 shadow-sm group overflow-hidden">
                <div className="flex justify-between items-start mb-1.5 md:mb-4">
                  <div className={`w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${stat.bg}`}>
                    <stat.icon className={`w-3.5 h-3.5 md:w-5 md:h-5 ${stat.color}`} />
                  </div>
                  <button className="text-slate-300 hover:text-slate-500 transition-colors p-1 rounded-full hover:bg-slate-50 hidden md:block">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  {'isTopGiver' in stat && stat.isTopGiver ? (
                    <>
                      <h3 className="text-[12px] md:text-sm font-black text-slate-800 tracking-tight mb-0.5 truncate" title={stat.topGiverName}>{stat.topGiverName}</h3>
                      <p className="text-[9px] md:text-xs font-semibold text-amber-600 mb-0.5 truncate">{stat.topGiverFellowship}</p>
                      <p className="text-[10px] md:text-sm font-bold text-slate-500">{stat.amount}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-[11px] md:text-base font-black text-slate-800 tracking-tight mb-0.5 md:mb-0.5">{stat.amount}</h3>
                      <p className="text-slate-500 font-bold text-[9px] md:text-xs uppercase tracking-wider opacity-80 leading-tight">{stat.label}</p>
                    </>
                  )}
                </div>
                {/* Decorative background element */}
                <div className={`absolute top-0 right-0 w-16 h-16 md:w-32 md:h-32 bg-gradient-to-br from-white to-transparent opacity-50 rounded-full blur-2xl md:blur-3xl -z-10 ${stat.shadow}`}></div>
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

            <div className="glass-panel p-2 overflow-x-auto w-full max-w-[calc(100vw-2.5rem)] md:max-w-full">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 border-b border-gray-100">
                    <th className="px-3 py-3 whitespace-nowrap">ID</th>
                    <th className="px-3 py-3 whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 whitespace-nowrap">Fellowship</th>
                    <th className="px-3 py-3 whitespace-nowrap">Method</th>
                    <th className="px-3 py-3 whitespace-nowrap">Member</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.slice(0, 5).map((txn, i) => (
                    <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-3">
                        <span className="font-bold text-gray-700 text-xs whitespace-nowrap">{txn.id.slice(-6)}</span>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">
                        {new Date(txn.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-xs font-bold whitespace-nowrap" style={{ color: getFellowshipColorHex(txn.fellowship) }}>
                        {txn.fellowship}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">{txn.method}</td>
                      <td className="px-3 py-3 text-xs font-bold text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={txn.memberName}>{txn.memberName}</td>
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

          <div className="dark-card p-8 h-[220px] relative shadow-xl shadow-indigo-900/10">
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
              {(() => {
                const data = getFellowshipData();
                const maxVal = Math.max(...data.map(d => d.value), 1);
                return data.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="w-32 font-bold text-gray-600 text-sm truncate">{item.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full mx-4 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                    <span className="w-16 text-right font-bold text-gray-800 text-sm">₵{item.value.toLocaleString()}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
