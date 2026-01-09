import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore } from '../store';
import { Search, Filter, MoreVertical, Plus, X, Pencil, RotateCcw, ChevronDown, Trash2 } from 'lucide-react';
import { Fellowship, FELLOWSHIP_PASTORS, Member } from '../types';
import { getFellowshipBadgeClasses } from '../lib/fellowshipColors';

export const Directory: React.FC = () => {
  const { members, addMember, updateMember, deleteMember } = useDataStore();

  // Search State
  const [filter, setFilter] = useState('');

  // Advanced Filter State (UI)
  const [showFilters, setShowFilters] = useState(false);
  const [fellowshipFilter, setFellowshipFilter] = useState<Fellowship | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PROVISIONAL'>('ALL');
  const [minYtd, setMinYtd] = useState<string>('');
  const [maxYtd, setMaxYtd] = useState<string>('');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'YTD_DESC' | 'YTD_ASC'>('NAME_ASC');

  // Applied Filter State (Logic)
  const [appliedFilters, setAppliedFilters] = useState({
    fellowship: 'ALL' as Fellowship | 'ALL',
    status: 'ALL' as 'ALL' | 'ACTIVE' | 'PROVISIONAL',
    minYtd: '',
    maxYtd: '',
    sortBy: 'NAME_ASC' as 'NAME_ASC' | 'YTD_DESC' | 'YTD_ASC'
  });

  // Add/Edit Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberFellowship, setNewMemberFellowship] = useState<Fellowship>(Fellowship.Thyatira);

  const handleApplyFilters = () => {
    setAppliedFilters({
      fellowship: fellowshipFilter,
      status: statusFilter,
      minYtd,
      maxYtd,
      sortBy
    });
  };

  const resetFilters = () => {
    setFilter('');
    setFellowshipFilter('ALL');
    setStatusFilter('ALL');
    setMinYtd('');
    setMaxYtd('');
    setSortBy('NAME_ASC');

    // Also reset applied
    setAppliedFilters({
      fellowship: 'ALL',
      status: 'ALL',
      minYtd: '',
      maxYtd: '',
      sortBy: 'NAME_ASC'
    });
  };

  const filteredData = members
    .filter(m => {
      // 1. Text Search
      const searchLower = filter.toLowerCase();
      const matchesSearch =
        m.name.toLowerCase().includes(searchLower) ||
        m.phone.includes(filter) ||
        m.fellowship.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Fellowship Filter
      if (appliedFilters.fellowship !== 'ALL' && m.fellowship !== appliedFilters.fellowship) return false;

      // 3. Status Filter
      if (appliedFilters.status !== 'ALL' && m.status !== appliedFilters.status) return false;

      // 4. YTD Range
      const min = appliedFilters.minYtd ? parseFloat(appliedFilters.minYtd) : -Infinity;
      const max = appliedFilters.maxYtd ? parseFloat(appliedFilters.maxYtd) : Infinity;
      if (m.ytdTotal < min || m.ytdTotal > max) return false;

      return true;
    })
    .sort((a, b) => {
      switch (appliedFilters.sortBy) {
        case 'YTD_DESC':
          return b.ytdTotal - a.ytdTotal;
        case 'YTD_ASC':
          return a.ytdTotal - b.ytdTotal;
        case 'NAME_ASC':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentMembers = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage < 3) {
        pages.push(1, 2, '...', totalPages);
      } else if (currentPage > totalPages - 2) {
        pages.push(1, '...', totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  const handleAddMember = async () => {
    if (!newMemberName) return;

    if (editingMember) {
      // Update existing
      await updateMember(editingMember.id, {
        name: newMemberName,
        phone: newMemberPhone,
        fellowship: newMemberFellowship
      });
    } else {
      // Create new
      await addMember({
        name: newMemberName,
        phone: newMemberPhone,
        fellowship: newMemberFellowship
      });
    }

    // Reset and Close
    setEditingMember(null);
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberFellowship(Fellowship.Thyatira);
    setIsAddMemberOpen(false);
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setNewMemberName(member.name);
    setNewMemberPhone(member.phone);
    setNewMemberFellowship(member.fellowship);
    setIsAddMemberOpen(true);
  };

  const handleCloseModal = () => {
    setEditingMember(null);
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberFellowship(Fellowship.Thyatira);
    setIsAddMemberOpen(false);
  };

  return (
    <div className="animate-fade-in relative min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Member Directory</h2>
          <p className="text-slate-500 font-medium mt-1">Manage church membership database</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-white/20">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
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

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm border ${showFilters
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="mt-6 p-6 bg-slate-50/80 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              {/* Fellowship Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fellowship</label>
                <select
                  value={fellowshipFilter}
                  onChange={(e) => setFellowshipFilter(e.target.value as Fellowship | 'ALL')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Fellowships</option>
                  {Object.values(Fellowship).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Member Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PROVISIONAL">Provisional</option>
                </select>
              </div>

              {/* YTD Range */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">YTD Giving Range</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minYtd}
                    onChange={(e) => setMinYtd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxYtd}
                    onChange={(e) => setMaxYtd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Sort By & Apply/Reset */}
              <div className="space-y-2 flex flex-col justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2"
                  >
                    <option value="NAME_ASC">Name (A-Z)</option>
                    <option value="YTD_DESC">Highest Giving</option>
                    <option value="YTD_ASC">Lowest Giving</option>
                  </select>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={resetFilters}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center space-x-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full max-w-[calc(100vw-2rem)] md:max-w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-8 py-5">Name / ID</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-6 py-5">Fellowship</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">YTD Giving</th>
                <th className="px-6 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {currentMembers.map((member) => (
                <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-800">{member.name}</div>
                    <div className="text-xs text-slate-400 font-mono font-medium">000000</div>
                  </td>
                  <td className="px-6 py-5 text-slate-600 font-medium">
                    {member.phone}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${getFellowshipBadgeClasses(member.fellowship)}`}>
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
                  <td className="px-6 py-5 text-right flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditClick(member)}
                      className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="Edit Member"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ${member.name}? This will also delete their transaction history.`)) {
                          deleteMember(member.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Member"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-sm font-medium gap-4">
            <span className="text-slate-400 whitespace-nowrap">
              Showing <span className="font-bold text-indigo-900">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}</span> to <span className="font-bold text-indigo-900">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-bold text-indigo-900">{filteredData.length}</span> entries
            </span>

            <div className="flex flex-nowrap items-center gap-2 w-full md:w-auto justify-center md:justify-end overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
              >
                Previous
              </button>

              <div className="flex space-x-1 flex-nowrap">
                {getPageNumbers().map((page, idx) => (
                  typeof page === 'number' ? (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[2.5rem] h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all shadow-sm ${currentPage === page
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 transform scale-105'
                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-slate-600'
                        }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={idx} className="w-10 h-10 flex items-center justify-center text-slate-400 font-bold pb-2">...</span>
                  )
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isAddMemberOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1e1e2d] px-8 py-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </h3>
              <button onClick={handleCloseModal} className="text-white/50 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="024XXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Fellowship & Pastor</label>
                <div className="relative">
                  <select
                    value={newMemberFellowship}
                    onChange={(e) => setNewMemberFellowship(e.target.value as Fellowship)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.values(Fellowship).map((f) => (
                      <option key={f} value={f}>
                        {f} - {FELLOWSHIP_PASTORS[f]}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleAddMember}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                >
                  {editingMember ? 'Save Changes' : 'Save Member'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
