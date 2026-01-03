import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore } from '../store';
import { Search, Filter, MoreVertical, Plus, X, Pencil } from 'lucide-react';
import { Fellowship, FELLOWSHIP_PASTORS, Member } from '../types';
import { getFellowshipBadgeClasses } from '../lib/fellowshipColors';

export const Directory: React.FC = () => {
  const { members, addMember, updateMember } = useDataStore();
  const [filter, setFilter] = useState('');

  // Add/Edit Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberFellowship, setNewMemberFellowship] = useState<Fellowship>(Fellowship.Thyatira);

  const filteredData = members.filter(m =>
    m.name.toLowerCase().includes(filter.toLowerCase()) ||
    m.phone.includes(filter) ||
    m.fellowship.toLowerCase().includes(filter.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentMembers = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
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
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => handleEditClick(member)}
                      className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="Edit Member"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="p-6 border-t border-slate-100 flex justify-between items-center text-sm font-medium">
            <span className="text-slate-400">
              Showing <span className="font-bold text-indigo-900">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}</span> to <span className="font-bold text-indigo-900">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-bold text-indigo-900">{filteredData.length}</span> entries
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Previous
              </button>

              <div className="flex space-x-1">
                {getPageNumbers().map((page, idx) => (
                  typeof page === 'number' ? (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all shadow-sm ${currentPage === page
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
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
