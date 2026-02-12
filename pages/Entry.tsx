import React, { useState, useEffect, useRef } from 'react';
import { useDataStore, useAuthStore } from '../store';
import { PaymentMethod, Transaction, Fellowship, FELLOWSHIP_PASTORS, Role } from '../types';
import { getSundayDate } from '../lib/dateUtils';
import { Calendar, Trash2, Filter, Play, Power, ArrowLeft, Upload, Users, X, UserPlus } from 'lucide-react';


export const Entry: React.FC = () => {
  const { members, transactions, activeBatchId, bulkAddTransactions, deleteTransaction, addMember } = useDataStore();
  const { user } = useAuthStore();

  // Session State
  const [sessionYear, setSessionYear] = useState('2025');
  const [sessionMonth, setSessionMonth] = useState('JANUARY');
  const [sessionWeek, setSessionWeek] = useState(1);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Workflow State
  const [viewMode, setViewMode] = useState<'FELLOWSHIP_SELECT' | 'BULK_ENTRY'>('FELLOWSHIP_SELECT');
  const [selectedFellowship, setSelectedFellowship] = useState<Fellowship | null>(null);
  const [bulkEntries, setBulkEntries] = useState<Record<string, string>>({}); // MemberId -> Amount (string for input handling)

  // Filtering & Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);


  // Pending Filter State (Form)
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [filterFellowship, setFilterFellowship] = useState<Fellowship | 'ALL'>('ALL');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Applied Filter State (Table)
  const [appliedFilters, setAppliedFilters] = useState({
    method: 'ALL' as PaymentMethod | 'ALL',
    fellowship: 'ALL' as Fellowship | 'ALL',
    min: '',
    max: '',
    startDate: '',
    endDate: ''
  });

  // Refs
  const filterWrapperRef = useRef<HTMLDivElement>(null);

  // Click Outside Handler for Filter
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterWrapperRef]);

  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Bulk Entry Logic
  const getMembersInFellowship = () => {
    return members.filter(m => m.fellowship === selectedFellowship && m.status === 'ACTIVE');
  };

  const handleBulkAmountChange = (memberId: string, value: string) => {
    setBulkEntries(prev => ({
      ...prev,
      [memberId]: value
    }));
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !selectedFellowship) return;
    setIsAddingMember(true);

    try {
      await addMember({
        name: newMemberName,
        phone: newMemberPhone,
        fellowship: selectedFellowship
      });

      // Reset and Close
      setNewMemberName('');
      setNewMemberPhone('');
      setIsAddMemberOpen(false);
    } catch (error) {
      console.error(error);
      alert('Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const submitBulkSession = async () => {
    if (!selectedFellowship) return;

    const entriesToSubmit: Transaction[] = [];
    const memberIds = Object.keys(bulkEntries);
    const timestamp = getSundayDate(parseInt(sessionYear), sessionMonth, sessionWeek);
    const batchId = `BATCH-${Date.now()}`; // Ideally this should be the active batch ID or a new session one

    memberIds.forEach(id => {
      const amountStr = bulkEntries[id];
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && amount > 0) {
        const member = members.find(m => m.id === id);
        if (member) {
          entriesToSubmit.push({
            id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            batchId: activeBatchId || batchId,
            memberId: member.id,
            memberName: member.name,
            fellowship: member.fellowship,
            amount: amount,
            method: PaymentMethod.CASH, // Default to CASH for now, maybe add toggle later
            timestamp: timestamp,
            officerId: user?.id || 'sys',
            officerName: user?.name || 'Admin Entry'
          });
        }
      }
    });

    if (entriesToSubmit.length > 0) {
      await bulkAddTransactions(entriesToSubmit);
      // alert(`Successfully saved ${entriesToSubmit.length} transactions!`);
      // Reset or go back
      setBulkEntries({});
      setViewMode('FELLOWSHIP_SELECT');
      setSelectedFellowship(null);
    }
  };

  // Pagination Logic (unchanged for right panel)
  const itemsPerPage = 7;
  const filteredTransactions = transactions.filter(t => {
    const matchesMethod = appliedFilters.method === 'ALL' || t.method === appliedFilters.method;
    const matchesFellowship = appliedFilters.fellowship === 'ALL' || t.fellowship === appliedFilters.fellowship;

    const amount = t.amount;
    const min = appliedFilters.min ? parseFloat(appliedFilters.min) : 0;
    const max = appliedFilters.max ? parseFloat(appliedFilters.max) : Infinity;
    const matchesAmount = amount >= min && amount <= max;

    const txnDate = t.timestamp.split('T')[0];
    const matchesDate = (!appliedFilters.startDate || txnDate >= appliedFilters.startDate) &&
      (!appliedFilters.endDate || txnDate <= appliedFilters.endDate);

    return matchesMethod && matchesFellowship && matchesAmount && matchesDate;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenFilter = () => {
    if (!isFilterOpen) {
      setFilterMethod(appliedFilters.method);
      setFilterFellowship(appliedFilters.fellowship);
      setFilterMinAmount(appliedFilters.min);
      setFilterMaxAmount(appliedFilters.max);
      setFilterStartDate(appliedFilters.startDate);
      setFilterEndDate(appliedFilters.endDate);
    }
    setIsFilterOpen(!isFilterOpen);
  };

  const handleApplyFilter = () => {
    setAppliedFilters({
      method: filterMethod,
      fellowship: filterFellowship,
      min: filterMinAmount,
      max: filterMaxAmount,
      startDate: filterStartDate,
      endDate: filterEndDate
    });
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

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

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 md:gap-6 animate-fade-in pb-4 md:pb-4 w-full max-w-[100vw] overflow-x-hidden px-0 md:px-0 box-border h-auto md:max-h-[calc(100vh-180px)] overflow-y-auto pb-[120px] md:pb-8">
      {/* Left Panel - Entry Form */}
      <div className="w-full lg:w-5/12 flex flex-col h-auto bg-white rounded-xl p-1 md:p-6 pb-3 md:pb-16 relative border-gray-200 mx-auto lg:mx-0 max-w-full overflow-x-hidden shadow-sm">
        {!isSessionActive ? (
          // SESSION SETUP VIEW
          <div className="flex flex-col h-auto w-full animate-fade-in">
            <div className="mb-2 md:mb-1 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-1.5 md:mb-1 text-indigo-600 shadow-inner">
                <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <h2 className="text-base md:text-lg font-black text-slate-800 mb-0.5 md:mb-0.5 text-center">Start a Session</h2>
              <p className="text-slate-500 font-medium text-[10px] md:text-xs text-center">Select the period for these transactions</p>
            </div>

            <div className="space-y-3 md:space-y-2 w-full mx-auto px-1 max-w-full">
              {/* Fiscal Year */}
              <div className="mb-2 md:mb-1">
                <label className="block text-[10px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-1 text-left">Fiscal Year</label>
                <div className="relative">
                  <select
                    value={sessionYear}
                    onChange={(e) => setSessionYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 md:py-1 px-3 font-bold text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow cursor-pointer hover:bg-slate-100"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>

              {/* Month */}
              <div className="w-full">
                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1 text-left">Month</label>
                <div className="grid grid-cols-6 gap-0.5 w-full mb-2 md:mb-2">
                  {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSessionMonth(m)}
                      className={`py-1 md:py-1 rounded text-[9px] md:text-[10px] font-bold transition-all flex items-center justify-center ${sessionMonth === m
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Week */}
              <div className="w-full">
                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1 text-left">Week Number</label>
                <div className="grid grid-cols-5 gap-0 w-full bg-slate-100 p-1 rounded-lg mb-2 md:mb-2">
                  {['1', '2', '3', '4', '5'].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSessionWeek(parseInt(w))}
                      className={`py-1 md:py-1 rounded text-[10px] md:text-sm font-bold transition-all flex items-center justify-center ${sessionWeek.toString() === w
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => {
                  setIsSessionActive(true);
                  setViewMode('FELLOWSHIP_SELECT');
                }}
                className="w-full bg-indigo-600 text-white font-bold py-3 md:py-2 rounded-xl text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center mt-2 mb-2 md:mt-1 active:scale-[0.98]"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Start Session
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-fade-in relative">
            {/* Session Header Banner */}
            <div className="bg-slate-900 rounded-xl p-3 mb-4 flex justify-between items-center text-white shadow-lg sticky top-0 z-20">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-0.5">Active Session</div>
                <div className="font-bold flex items-center text-sm md:text-base">
                  <Calendar className="w-3.5 h-3.5 mr-2 opacity-75" />
                  {sessionMonth.slice(0, 3)} {sessionYear} <span className="mx-2 opacity-50">|</span> Week {sessionWeek}
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('End session? Unsaved inputs will be lost.')) {
                    setIsSessionActive(false);
                    setBulkEntries({});
                    setViewMode('FELLOWSHIP_SELECT');
                  }
                }}
                className="bg-red-600/90 hover:bg-red-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                title="End Session"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>

            {viewMode === 'FELLOWSHIP_SELECT' && (
              <div className="animate-fade-in flex-1">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Select Fellowship</h2>
                  <p className="text-slate-400 text-xs mt-1">Choose a fellowship to begin bulk entry</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {Object.values(Fellowship).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setSelectedFellowship(f);
                        setViewMode('BULK_ENTRY');
                      }}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all group text-left relative overflow-hidden"
                    >
                      <div className="font-bold text-slate-700 group-hover:text-indigo-800 mb-1 z-10 relative">{f}</div>
                      <div className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-400 z-10 relative">{FELLOWSHIP_PASTORS[f]}</div>
                      <div className="absolute right-2 bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-8 h-8 text-indigo-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'BULK_ENTRY' && selectedFellowship && (
              <div className="animate-fade-in flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (Object.keys(bulkEntries).length > 0) {
                          if (!window.confirm('Go back? Unsaved entries will be lost.')) return;
                        }
                        setBulkEntries({});
                        setViewMode('FELLOWSHIP_SELECT');
                      }}
                      className="flex items-center text-slate-500 hover:text-indigo-600 text-xs font-bold transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3 mr-1" /> Back
                    </button>
                    <div className="h-4 w-px bg-slate-300 mx-1"></div>
                    <button
                      onClick={() => {
                        setNewMemberName('');
                        setNewMemberPhone('');
                        setIsAddMemberOpen(true);
                      }}
                      className="flex items-center text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg"
                    >
                      <UserPlus className="w-3 h-3 mr-1" /> Add Member
                    </button>
                  </div>

                  <div className="text-center">
                    <h3 className="font-bold text-slate-800">{selectedFellowship}</h3>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{getMembersInFellowship().length} Active Members</span>
                  </div>
                  <div className="w-10"></div> {/* Spacer for centering */}
                </div>

                <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-2 pb-20">
                  {getMembersInFellowship().length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      No active members found. <br />
                      <button
                        onClick={() => setIsAddMemberOpen(true)}
                        className="text-indigo-600 font-bold hover:underline mt-2 text-xs"
                      >
                        Add the first member
                      </button>
                    </div>
                  ) : (
                    getMembersInFellowship().map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1">
                          <div className="font-bold text-slate-700 text-sm">{member.name}</div>
                          <div className="text-[10px] text-slate-400">{member.phone}</div>
                        </div>
                        <div className="relative w-32 md:w-40">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">GH₵</span>
                          <input
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-right font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                            placeholder="0.00"
                            value={bulkEntries[member.id] || ''}
                            onChange={(e) => handleBulkAmountChange(member.id, e.target.value)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // Logic to move to next input could exist here, or just blur
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-slate-100 z-20">
                  <button
                    onClick={submitBulkSession}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-2xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center text-sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Session ({Object.keys(bulkEntries).filter(k => parseFloat(bulkEntries[k]) > 0).length})
                  </button>
                </div>
              </div>
            )}

            {/* Add Member Modal */}
            {isAddMemberOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Add New Member</h3>
                    <button
                      onClick={() => setIsAddMemberOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start">
                      <Users className="w-4 h-4 text-indigo-600 mt-0.5 mr-2 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-indigo-900">Auto-Assigning to {selectedFellowship}</p>
                        <p className="text-[10px] text-indigo-700/80">New member will be added to the current list instantly.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        autoFocus
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 0244123456"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleAddMember}
                        disabled={!newMemberName.trim() || isAddingMember}
                        className="w-full bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center"
                      >
                        {isAddingMember ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add & Return to List
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


      </div>


      {/* RIGHT PANEL - FEED */}
      <div className="w-full lg:w-7/12 flex flex-col h-auto lg:h-full mx-auto lg:ml-0">
        {/* Stats Strip */}
        <div className="glass-card mb-4 md:mb-6 p-1 flex justify-between items-center pr-2">
          <div className="flex-1 px-4 md:px-4 py-2 md:py-2">
            <p className="text-slate-400 text-[10px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 md:mb-0.5">Session Total</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              GH₵{transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="flex space-x-2 mr-2 z-30">
            <div className="relative" ref={filterWrapperRef}>
              <button
                onClick={handleOpenFilter}
                className={`flex items-center space-x-2 px-3 md:px-3 py-2 md:py-2 rounded-xl font-bold transition-all shadow-sm border ${isFilterOpen || appliedFilters.method !== 'ALL' || appliedFilters.fellowship !== 'ALL' || appliedFilters.min || appliedFilters.max || appliedFilters.startDate || appliedFilters.endDate
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden md:inline">Filter Transactions</span>
                <span className="md:hidden">Filter</span>
              </button>

              {/* Filter Popover */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 animate-fade-in z-50">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Filter By</h4>
                      {(filterMethod !== 'ALL' || filterFellowship !== 'ALL' || filterMinAmount || filterMaxAmount || filterStartDate || filterEndDate) && (
                        <button
                          onClick={() => {
                            setFilterMethod('ALL');
                            setFilterFellowship('ALL');
                            setFilterMinAmount('');
                            setFilterMaxAmount('');
                            setFilterStartDate('');
                            setFilterEndDate('');
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-600"
                        >
                          Reset Form
                        </button>
                      )}
                    </div>

                    {/* Fellowship */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Fellowship</label>
                      <select
                        value={filterFellowship}
                        onChange={(e) => setFilterFellowship(e.target.value as Fellowship | 'ALL')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">All Fellowships</option>
                        {Object.values(Fellowship).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    {/* Method */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Payment Method</label>
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                        {['ALL', PaymentMethod.CASH, PaymentMethod.MOMO].map((m) => (
                          <button
                            key={m}
                            onClick={() => setFilterMethod(m as PaymentMethod | 'ALL')}
                            className={`flex-1 py-2 text-xs font-bold transition-colors ${filterMethod === m
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                              }`}
                          >
                            {m === 'ALL' ? 'All' : m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Date Range</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Amount Range */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Amount Range (GH₵)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filterMinAmount}
                          onChange={(e) => setFilterMinAmount(e.target.value)}
                          className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={filterMaxAmount}
                          onChange={(e) => setFilterMaxAmount(e.target.value)}
                          className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={handleApplyFilter}
                      className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                    >
                      Apply Filter
                    </button>

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="glass-card flex-1 overflow-hidden flex flex-col border-white/40">
          <div className="p-3 md:p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 backdrop-blur-sm">
            <h3 className="font-bold text-slate-700 text-sm md:text-lg">Recent Transactions</h3>
            <span className="text-[10px] md:text-xs font-bold bg-indigo-100 text-indigo-700 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-indigo-200 shadow-sm">
              {transactions.length} Records
            </span>
          </div>
          <div className="w-full overflow-x-auto flex-1 p-1 md:p-2 pb-4 visible-scrollbar">
            <table className="w-full border-separate border-spacing-y-1">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-3 md:px-4 py-2 md:py-2 bg-white/80 backdrop-blur rounded-l-xl">Date</th>
                  <th className="px-3 md:px-4 py-2 md:py-2 bg-white/80 backdrop-blur">Entered By</th>
                  <th className="px-3 md:px-4 py-2 md:py-2 bg-white/80 backdrop-blur">Member</th>
                  <th className="px-3 md:px-4 py-2 md:py-2 bg-white/80 backdrop-blur">Method</th>
                  <th className="px-3 md:px-4 py-2 md:py-2 text-right bg-white/80 backdrop-blur">Amount</th>
                  <th className="px-2 md:px-4 py-2 md:py-2 w-10 bg-white/80 backdrop-blur rounded-r-xl"></th>
                </tr>
              </thead>
              <tbody>
                {currentTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-white/60 transition-colors group">
                    <td className="px-3 md:px-4 py-2 md:py-2 text-slate-500 font-mono text-[10px] md:text-xs font-medium rounded-l-xl border-l-4 border-transparent hover:border-indigo-400">
                      {new Date(txn.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-2 text-[10px] md:text-xs font-bold text-indigo-900/70">
                      {txn.officerName || 'Admin Entry'}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-2">
                      <div className="font-bold text-slate-700 text-xs md:text-sm">{txn.memberName}</div>
                      <div className="text-[10px] md:text-[10px] text-slate-400 font-medium">{txn.fellowship}</div>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-2">
                      <span className={`text-[10px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-0.5 rounded-md border ${txn.method === PaymentMethod.CASH ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        txn.method === PaymentMethod.MOMO ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        {txn.method}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-2 text-right font-bold text-slate-800 text-sm md:text-sm">
                      GH₵{txn.amount.toLocaleString()}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 rounded-r-xl text-center">
                      {(
                        (txn.officerId === user?.id) ||
                        ((!txn.officerId || txn.officerId === 'sys') && user?.role === Role.SUPERVISOR)
                      ) && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this transaction?')) {
                                deleteTransaction(txn.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 0 && (
            <div className="p-6 border-t border-slate-100 flex justify-between items-center text-sm font-medium">
              <span className="text-slate-400 text-xs md:text-sm">
                Showing <span className="font-bold text-indigo-900">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)}</span>-<span className="font-bold text-indigo-900">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="font-bold text-indigo-900">{filteredTransactions.length}</span>
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
      </div>
    </div >
  );
};
