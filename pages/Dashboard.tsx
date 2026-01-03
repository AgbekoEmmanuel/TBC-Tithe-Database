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

export const Dashboard: React.FC = () => {
  const { transactions, members } = useDataStore();

  type WeekOption = 'All' | '1' | '2' | '3' | '4';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [velocityFilter, setVelocityFilter] = React.useState<{ month: string; week: WeekOption }>({ month: 'Jan', week: 'All' });
  const [fellowshipFilter, setFellowshipFilter] = React.useState<{ month: string; week: WeekOption }>({ month: 'Jan', week: 'All' });

  const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);
  const activeGivers = new Set(transactions.map(t => t.memberId)).size;
  const avgGift = activeGivers > 0 ? totalAmount / activeGivers : 0;

  // Format currency
  const fmt = (n: number) => `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 0 })}`;

  // --- Dynamic Data Generators ---

  // Returns data for Mon-Sun (Daily)
  const getDailyData = () => [
    { name: 'Mon', amount: 1200 },
    { name: 'Tue', amount: 3400 },
    { name: 'Wed', amount: 8200 },
    { name: 'Thu', amount: 5600 },
    { name: 'Fri', amount: 4100 },
    { name: 'Sat', amount: 7300 },
    { name: 'Sun', amount: 9500 },
  ];

  // Returns data for Week 1-4 (Weekly)
  const getWeeklyData = () => [
    { name: 'Week 1', amount: 15400 },
    { name: 'Week 2', amount: 23500 },
    { name: 'Week 3', amount: 18200 },
    { name: 'Week 4', amount: 28900 },
  ];

  const getChartData = (filter: { month: string; week: WeekOption }) => {
    return filter.week === 'All' ? getWeeklyData() : getDailyData();
  };

  const getFellowshipData = (filter: { month: string; week: WeekOption }) => {
    // Simulate different distributions based on week drill-down
    if (filter.week !== 'All') {
      return [
        { name: 'Thyatira', value: 4500, color: '#4f46e5' },
        { name: 'Philippi', value: 3200, color: '#0ea5e9' },
        { name: 'Ephesus', value: 2800, color: '#10b981' },
        { name: 'Smyrna', value: 1500, color: '#f59e0b' },
      ];
    }
    return [
      { name: 'Laodicea', value: 12500, color: '#4f46e5' },
      { name: 'Balance', value: 9200, color: '#0ea5e9' },
      { name: 'Thyatira', value: 8800, color: '#10b981' },
      { name: 'Berea', value: 6500, color: '#f59e0b' },
    ];
  };

  const TimeFilter = ({
    value,
    onChange
  }: {
    value: { month: string; week: WeekOption },
    onChange: (val: { month: string; week: WeekOption }) => void
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
        value={value.week}
        onChange={(e) => onChange({ ...value, week: e.target.value as WeekOption })}
        className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer pr-2"
      >
        <option value="All">All Weeks</option>
        <option value="1">Week 1</option>
        <option value="2">Week 2</option>
        <option value="3">Week 3</option>
        <option value="4">Week 4</option>
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
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[1, 2, 3].map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center text-gray-400">
                            <Hash className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-gray-700"># {2045 - i}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-600">Today, 10:3{i} AM</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-600">Cash</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">Member {i + 1}</td>
                      <td className="px-6 py-4 text-right text-emerald-500 font-bold">GH₵ {(500 - i * 50).toLocaleString()}</td>
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
                <AreaChart data={getChartData(velocityFilter)}>
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
              {getFellowshipData(fellowshipFilter).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="w-32 font-bold text-gray-600 text-sm truncate">{item.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full mx-4 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.value / (fellowshipFilter.week === 'All' ? 12500 : 4500)) * 100}%`, backgroundColor: item.color }}></div>
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
