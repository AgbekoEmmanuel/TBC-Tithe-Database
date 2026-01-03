import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell } from 'recharts';
import { Download, Printer } from 'lucide-react';

export const Analytics: React.FC = () => {
  type WeekOption = 'All' | '1' | '2' | '3' | '4';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [trendFilter, setTrendFilter] = React.useState<{ month: string; week: WeekOption }>({ month: 'Jan', week: 'All' });
  const [distFilter, setDistFilter] = React.useState<{ month: string; week: WeekOption }>({ month: 'Jan', week: 'All' });

  // Data Generators
  const getWeeklyData = () => [
    { name: 'Week 1', amount: 12500 },
    { name: 'Week 2', amount: 18200 },
    { name: 'Week 3', amount: 15900 },
    { name: 'Week 4', amount: 21000 },
  ];

  const getDailyData = () => [
    { name: 'Mon', amount: 800 },
    { name: 'Tue', amount: 1200 },
    { name: 'Wed', amount: 950 },
    { name: 'Thu', amount: 1100 },
    { name: 'Fri', amount: 1800 },
    { name: 'Sat', amount: 2500 },
    { name: 'Sun', amount: 3100 },
  ];

  const getPieData = (week: WeekOption) => week === 'All' ? [
    { name: 'Cash', value: 4000 },
    { name: 'Momo', value: 3000 },
  ] : [
    { name: 'Cash', value: 400 },
    { name: 'Momo', value: 300 },
  ];

  const chartData = trendFilter.week === 'All' ? getWeeklyData() : getDailyData();
  const pieChartData = getPieData(distFilter.week);

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6'];

  const TimeFilter = ({
    value,
    onChange,
    dark = false
  }: {
    value: { month: string; week: WeekOption },
    onChange: (val: { month: string; week: WeekOption }) => void,
    dark?: boolean
  }) => (
    <div className={`p-1 rounded-xl flex items-center space-x-2 ${dark ? 'bg-[#ffffff10] border border-white/10' : 'bg-white border border-slate-100 shadow-sm'}`}>
      <select
        value={value.month}
        onChange={(e) => onChange({ ...value, month: e.target.value })}
        className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pl-2 ${dark ? 'text-white' : 'text-slate-600'} appearance-none`}
      >
        {MONTHS.map(m => <option key={m} value={m} className="text-slate-900">{m}</option>)}
      </select>
      <div className={`w-[1px] h-4 ${dark ? 'bg-white/20' : 'bg-slate-200'}`}></div>
      <select
        value={value.week}
        onChange={(e) => onChange({ ...value, week: e.target.value as WeekOption })}
        className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-2 ${dark ? 'text-white' : 'text-slate-600'} appearance-none`}
      >
        <option value="All" className="text-slate-900">All Weeks</option>
        <option value="1" className="text-slate-900">Week 1</option>
        <option value="2" className="text-slate-900">Week 2</option>
        <option value="3" className="text-slate-900">Week 3</option>
        <option value="4" className="text-slate-900">Week 4</option>
      </select>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Financial Intelligence</h2>
          <p className="text-slate-500 font-medium mt-1">Deep dive into financial metrics</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-5 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm">
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Trend */}
        <div className="dark-card p-8 shadow-xl shadow-indigo-900/10 relative">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-white">Giving Trend</h3>
            <TimeFilter value={trendFilter} onChange={setTrendFilter} dark={true} />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => `₵${val / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: '#334155' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="amount" fill="#FB923C" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Method Distribution */}
        <div className="dark-card p-8 shadow-xl shadow-indigo-900/10 relative">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-white">Method Distribution</h3>
            <TimeFilter value={distFilter} onChange={setDistFilter} dark={true} />
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePie data={pieChartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                ))}
              </RePie>
            </ResponsiveContainer>
            <div className="ml-8 space-y-6">
              {pieChartData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3 shadow-md" style={{ backgroundColor: COLORS[index] }}></div>
                  <div>
                    <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider">{entry.name}</span>
                    <span className="block text-lg font-bold text-white">{((entry.value / (pieChartData.reduce((a, b) => a + b.value, 0))) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
