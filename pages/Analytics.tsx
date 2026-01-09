import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend } from 'recharts';
import { Download, Printer } from 'lucide-react';
import { useDataStore } from '../store';
import { Fellowship, PaymentMethod } from '../types';

export const Analytics: React.FC = () => {
  type WeekOption = 'All' | '1' | '2' | '3' | '4' | '5';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const YEARS = ['2024', '2025', '2026'];
  const FELLOWSHIPS = Object.values(Fellowship);

  const { transactions } = useDataStore();

  const [trendFilter, setTrendFilter] = useState<{ year: string; month: string; week: WeekOption }>({ year: '2025', month: 'Jan', week: 'All' });
  const [distFilter, setDistFilter] = useState<{ year: string; month: string; week: WeekOption }>({ year: '2025', month: 'Jan', week: 'All' });
  const [fellowshipFilter, setFellowshipFilter] = useState<{ year: string; month: string; week: WeekOption }>({ year: '2025', month: 'Jan', week: 'All' });

  // Import Logo for Report
  // We need to use the imported path. For jspdf valid types, we can pass the URL usually if it's served.
  // In Vite dev, it's a URL. In prod, it's a hashed URL.
  // jspdf addImage takes base64, url, or Image element.
  // We will pass the imported string.
  const LOGO_URL = (new URL('../src/images/TBC logo full.png', import.meta.url)).href;

  // --- Helper: Filter Transactions ---
  const filterTxns = (filter: { year: string; month: string; week: WeekOption }) => {
    const monthIdx = MONTHS.indexOf(filter.month);
    const year = parseInt(filter.year);

    return transactions.filter(t => {
      const d = new Date(t.timestamp);
      if (d.getMonth() !== monthIdx || d.getFullYear() !== year) return false;

      if (filter.week !== 'All') {
        const day = d.getDate();
        const weekIdx = Math.min(Math.floor((day - 1) / 7) + 1, 5);
        if (weekIdx.toString() !== filter.week) return false;
      }
      return true;
    });
  };

  // --- Data Generators ---

  const getChartData = useMemo(() => {
    const txns = filterTxns(trendFilter);

    if (trendFilter.week === 'All') {
      // Weekly Data
      const weeks = [0, 0, 0, 0, 0];
      txns.forEach(t => {
        const day = new Date(t.timestamp).getDate();
        const w = Math.min(Math.floor((day - 1) / 7), 4);
        weeks[w] += t.amount;
      });
      return weeks.map((amt, i) => ({ name: `Week ${i + 1}`, amount: amt })).filter(w => w.amount > 0 || w.name !== 'Week 5');
    } else {
      // Daily Data (Mon-Sun)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const daily = [0, 0, 0, 0, 0, 0, 0];
      txns.forEach(t => {
        const d = new Date(t.timestamp).getDay(); // 0 = Sun
        daily[d] += t.amount;
      });
      // Reorder to Mon-Sun if desired, or keep Sun-Sat. Let's do Mon-Sun.
      // 0(Sun), 1(Mon)... -> Mon(0), Tue(1)... Sun(6)
      const reordered = [
        { name: 'Mon', amount: daily[1] },
        { name: 'Tue', amount: daily[2] },
        { name: 'Wed', amount: daily[3] },
        { name: 'Thu', amount: daily[4] },
        { name: 'Fri', amount: daily[5] },
        { name: 'Sat', amount: daily[6] },
        { name: 'Sun', amount: daily[0] },
      ];
      return reordered;
    }
  }, [trendFilter, transactions]);

  const getPieData = useMemo(() => {
    const txns = filterTxns(distFilter);
    const methods = { [PaymentMethod.CASH]: 0, [PaymentMethod.MOMO]: 0, [PaymentMethod.CHECK]: 0 };

    txns.forEach(t => {
      if (methods[t.method] !== undefined) methods[t.method] += t.amount;
    });

    return Object.entries(methods)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [distFilter, transactions]);

  const getFellowshipWeeklyData = useMemo(() => {
    // Always show weekly breakdown regardless of week filter (week filter here acts as context if needed, but usually we want overview)
    // Actually, if 'All' is selected, show 5 weeks. If 'Week 1' is selected, maybe show just that week? 
    // The chart expects `week1`, `week2` keys. Let's ignore Week filter for this chart and show full month breakdown.

    const filterForMonth = { ...fellowshipFilter, week: 'All' as WeekOption };
    const txns = filterTxns(filterForMonth);

    const map: Record<string, { [key: string]: number }> = {};
    FELLOWSHIPS.forEach(f => {
      map[f] = { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
    });

    txns.forEach(t => {
      const f = t.fellowship;
      if (!map[f]) map[f] = { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 }; // Handle unlisted

      const day = new Date(t.timestamp).getDate();
      const w = Math.min(Math.floor((day - 1) / 7) + 1, 5);
      map[f][`week${w}`] += t.amount;
    });

    return FELLOWSHIPS.map(f => ({
      name: f,
      ...(map[f] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 })
    }));
  }, [fellowshipFilter, transactions]);


  const COLORS = ['#10b981', '#f59e0b', '#3b82f6']; // Cash, Momo, Check

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

  // --- Report Generation State & Handler ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<{ year: string; month: string; week: WeekOption }>({ year: '2025', month: 'Jan', week: 'All' });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // Lazy load the generator to ensure jspdf is loaded
      const { generatePDFReport } = await import('../lib/reportUtils');

      // Filter data based on report selection
      const reportTxns = filterTxns(reportFilter);

      // Compute Chart Data for the Report (Reuse logic from getFellowshipWeeklyData but specific to filtered set)
      const map: Record<string, { [key: string]: number }> = {};
      FELLOWSHIPS.forEach(f => {
        map[f] = { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
      });

      reportTxns.forEach(t => {
        const f = t.fellowship;
        if (!map[f]) map[f] = { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };

        const day = new Date(t.timestamp).getDate();
        const w = Math.min(Math.floor((day - 1) / 7) + 1, 5);
        map[f][`week${w}`] += t.amount;
      });

      const reportChartData = FELLOWSHIPS.map(f => ({
        name: f,
        week1: map[f].week1,
        week2: map[f].week2,
        week3: map[f].week3,
        week4: map[f].week4,
        week5: map[f].week5
      }));

      // Generate
      await generatePDFReport(reportTxns, reportFilter, reportChartData, LOGO_URL);

      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Report generation failed:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in relative">
      {/* Report Modal */}
      {isReportModalOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
          onClick={() => setIsReportModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2">Generate Report</h3>
            <p className="text-slate-500 text-sm mb-6">Select the period for your analytical report.</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Year</label>
                <select
                  value={reportFilter.year}
                  onChange={(e) => setReportFilter({ ...reportFilter, year: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Month</label>
                  <select
                    value={reportFilter.month}
                    onChange={(e) => setReportFilter({ ...reportFilter, month: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Week</label>
                  <select
                    value={reportFilter.week}
                    onChange={(e) => setReportFilter({ ...reportFilter, week: e.target.value as WeekOption })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    <option value="All">All</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center"
              >
                {isGenerating ? <span className="animate-spin mr-2">⏳</span> : <Download className="w-4 h-4 mr-2" />}
                Download PDF
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Financial Analytics</h2>
          <p className="text-slate-500 font-medium mt-1">Deep dive into financial metrics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Printer className="w-4 h-4" />
            <span>Generate PDF</span>
          </button>


        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Trend */}
        <div className="dark-card p-4 md:p-8 shadow-xl shadow-indigo-900/10 relative">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-white">Giving Trend</h3>
            <TimeFilter value={trendFilter} onChange={setTrendFilter} dark={true} />
          </div>
          <div className="h-[300px]">
            {getChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData}>
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
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-medium">No data for this period</div>
            )}
          </div>
        </div>

        {/* Method Distribution */}
        <div className="dark-card p-4 md:p-8 shadow-xl shadow-indigo-900/10 relative">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-white">Method Distribution</h3>
            <TimeFilter value={distFilter} onChange={setDistFilter} dark={true} />
          </div>
          <div className="flex flex-row items-center justify-between h-[300px]">
            <div className="flex-1 h-full min-w-0 relative">
              {getPieData.length > 0 ? (
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
                      data={getPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {getPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </RePie>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 font-medium w-full">No data available</div>
              )}
            </div>

            <div className="w-1/3 pl-8 flex flex-col justify-center space-y-8">
              {getPieData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-3 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ backgroundColor: COLORS[index % COLORS.length], boxShadow: `0 0 10px ${COLORS[index % COLORS.length]}40` }}></span>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">{entry.name}</span>
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight">
                    {((entry.value / (getPieData.reduce((a, b) => a + b.value, 0))) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fellowship Performance (Weekly) */}
        <div className="dark-card p-4 md:p-8 shadow-xl shadow-indigo-900/10 relative col-span-1 lg:col-span-2">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Fellowship Performance</h3>
              <p className="text-slate-400 text-sm mt-1">Weekly breakdown by fellowship</p>
            </div>
            {/* Note: We force 'All' weeks for this chart usually, but can keep filter if user wants to see specific week focus? 
                Actually the chart shows Week 1-5 bars, so filtering by "Week 1" would effectively show only one bar per fellowship. 
                Our logic currently ignores Week filter in 'getFellowshipWeeklyData'. */}
            <TimeFilter value={fellowshipFilter} onChange={setFellowshipFilter} dark={true} />
          </div>
          <div className="h-[400px] w-full overflow-x-auto max-w-[calc(100vw-4rem)] md:max-w-full">
            <div className="min-w-[800px] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getFellowshipWeeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
