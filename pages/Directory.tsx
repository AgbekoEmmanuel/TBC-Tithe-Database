import React, { useState } from 'react';
import { useDataStore } from '../store';
import { Search, Filter, MoreVertical, Plus } from 'lucide-react';

export const Directory: React.FC = () => {
  const { members } = useDataStore();
  const [filter, setFilter] = useState('');

  const filteredData = members.filter(m =>
    m.name.toLowerCase().includes(filter.toLowerCase()) ||
    m.phone.includes(filter) ||
    m.fellowship.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Member Directory</h2>
          <p className="text-slate-500 font-medium mt-1">Manage church membership database</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5">
            <Plus className="w-5 h-5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-white/20 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/40 backdrop-blur-sm">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-3 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, phone, or fellowship..."
              className="w-full bg-white/60 border border-slate-200 pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm focus:shadow-md"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button className="flex items-center space-x-2 text-slate-600 bg-white/60 border border-slate-200 px-6 py-3 rounded-xl hover:bg-white font-bold transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-8 py-5">Name / ID</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-6 py-5">Fellowship</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">YTD Giving</th>
                <th className="px-6 py-5">Last Gift</th>
                <th className="px-6 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredData.map((member) => (
                <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-800">{member.name}</div>
                    <div className="text-xs text-slate-400 font-mono font-medium">{member.id}</div>
                  </td>
                  <td className="px-6 py-5 text-slate-600 font-medium">
                    {member.phone}
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {member.fellowship}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {member.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        PROVISIONAL
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-bold text-slate-700 text-lg">
                    GH₵{member.ytdTotal.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                    {member.lastGiftDate ? new Date(member.lastGiftDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Mock */}
        <div className="p-6 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500 font-medium">
          <span>Showing 1 to {filteredData.length} of {filteredData.length} entries</span>
          <div className="flex space-x-2">
            <button className="px-4 py-2 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors" disabled>Previous</button>
            <button className="px-4 py-2 border border-indigo-200 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200">1</button>
            <button className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">2</button>
            <button className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};
