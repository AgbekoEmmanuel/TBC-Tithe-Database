import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend } from 'recharts';
import { Download, Printer } from 'lucide-react';

export const Analytics: React.FC = () => {
  type WeekOption = 'All' | '1' | '2' | '3' | '4' | '5';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const YEARS = ['2025', '2026'];
  const FELLOWSHIPS = ['Thyatira', 'Philippi', 'Laodicea', 'Balance', 'Ephesus', 'Smyrna', 'Sardis', 'Pergamos', 'Berea', 'Philadelphia'];

  const [trendFilter, setTrendFilter] = React.useState<{ year: string; month: string; week: WeekOption }>({ year: '2025', month: 'Jan', week: 'All' });
  const [distFilter, setDistFilter] = React.useState<{ year: string; month: string; week: WeekOption }>({ year: '2025', month: 'Jan', week: 'All' });
  const [fellowshipFilter, setFellowshipFilter] = React.useState<{ year: string; month: string; week: WeekOption }>({ year: '2025', month: 'Jan', week: 'All' });

  // Data Generators
  const getWeeklyData = () => [
    { name: 'Week 1', amount: 12500 },
    { name: 'Week 2', amount: 18200 },
    { name: 'Week 3', amount: 15900 },
    { name: 'Week 4', amount: 21000 },
    { name: 'Week 5', amount: 14500 },
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

  const getFellowshipWeeklyData = () => {
    return FELLOWSHIPS.map(fellowship => ({
      name: fellowship,
      week1: Math.floor(Math.random() * 5000) + 1000,
      week2: Math.floor(Math.random() * 5000) + 1000,
      week3: Math.floor(Math.random() * 5000) + 1000,
      week4: Math.floor(Math.random() * 5000) + 1000,
      week5: Math.floor(Math.random() * 5000) + 1000,
    }));
  };

  const getPieData = (week: WeekOption) => week === 'All' ? [
    { name: 'Cash', value: 4000 },
    { name: 'Momo', value: 3000 },
  ] : [
    { name: 'Cash', value: 400 },
    { name: 'Momo', value: 300 },
  ];

  const chartData = React.useMemo(() => trendFilter.week === 'All' ? getWeeklyData() : getDailyData(), [trendFilter]);
  const fellowshipData = React.useMemo(() => getFellowshipWeeklyData(), [fellowshipFilter]);
  const pieChartData = React.useMemo(() => getPieData(distFilter.week), [distFilter]);

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6'];

  const TimeFilter = ({
    value,
    onChange,
    dark = false
  }: {
    value: { year: string; month: string; week: WeekOption },
    onChange: (val: { year: string; month: string; week: WeekOption }) => void,
    dark?: boolean
  }) => (
    <div className={`p-1 rounded-xl flex items-center space-x-1 ${dark ? 'bg-[#ffffff10] border border-white/10' : 'bg-white border border-slate-100 shadow-sm'}`}>
      <select
        value={value.year}
        onChange={(e) => onChange({ ...value, year: e.target.value })}
        className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer px-2 py-1 ${dark ? 'text-white' : 'text-slate-600'} appearance-none`}
      >
        {YEARS.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
      </select>
      <div className={`w-[1px] h-3 ${dark ? 'bg-white/20' : 'bg-slate-200'}`}></div>
      <select
        value={value.month}
        onChange={(e) => onChange({ ...value, month: e.target.value })}
        className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer px-2 py-1 ${dark ? 'text-white' : 'text-slate-600'} appearance-none`}
      >
        {MONTHS.map(m => <option key={m} value={m} className="text-slate-900">{m}</option>)}
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
          <div className="flex flex-row items-center justify-between h-[300px]">
            <div className="flex-1 h-full min-w-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RePie>
              </ResponsiveContainer>
            </div>

            <div className="w-1/3 pl-8 flex flex-col justify-center space-y-8">
              {pieChartData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-3 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ backgroundColor: COLORS[index], boxShadow: `0 0 10px ${COLORS[index]}40` }}></span>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">{entry.name}</span>
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight">
                    {((entry.value / (pieChartData.reduce((a, b) => a + b.value, 0))) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fellowship Performance (Weekly) */}
        <div className="dark-card p-8 shadow-xl shadow-indigo-900/10 relative col-span-1 lg:col-span-2">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Fellowship Performance</h3>
              <p className="text-slate-400 text-sm mt-1">Weekly breakdown by fellowship</p>
            </div>
            <TimeFilter value={fellowshipFilter} onChange={setFellowshipFilter} dark={true} />
          </div>
          <div className="h-[400px] w-full overflow-x-auto">
            <div className="min-w-[800px] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fellowshipData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    dy={10}
                    interval={0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(val) => `₵${val / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: '#334155', opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      color: '#fff',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      padding: '12px'
                    }}
                    itemStyle={{ padding: 0 }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar dataKey="week1" name="Week 1" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="week2" name="Week 2" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="week3" name="Week 3" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="week4" name="Week 4" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="week5" name="Week 5" fill="#e11d48" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};
