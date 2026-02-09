import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore, useAuthStore } from '../store';
import { Member, PaymentMethod, Transaction, Fellowship, FELLOWSHIP_PASTORS } from '../types';
import { getSundayDate } from '../lib/dateUtils';
import { Search, Plus, Check, RotateCcw, User as UserIcon, Calendar, Save, UserPlus, X, Trash2, Filter, LogOut, Play, Power } from 'lucide-react';


export const Entry: React.FC = () => {
  const { members, transactions, activeBatchId, addTransaction, deleteTransaction, undoLastTransaction, addMember } = useDataStore();
  const { user } = useAuthStore();

  // Session State
  const [sessionYear, setSessionYear] = useState('2025');
  const [sessionMonth, setSessionMonth] = useState('JANUARY');
  const [sessionWeek, setSessionWeek] = useState(1);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [showToast, setShowToast] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberFellowship, setNewMemberFellowship] = useState<Fellowship>(Fellowship.Thyatira);
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

  const itemsPerPage = 7;

  // Pagination Logic
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
      // Sync pending state with active applied state when opening
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

  // Filtered members

  // Refs for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
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

  // Filtered members
  const filteredMembers = searchTerm.length > 1
    ? members.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm))
    : [];

  const handleQuickAdd = async () => {
    if (!newMemberName) return;
    const newMember = await addMember({
      name: newMemberName,
      phone: newMemberPhone,
      fellowship: newMemberFellowship
    });

    if (newMember) {
      handleMemberSelect(newMember);
    }

    setIsAddMemberOpen(false);
    // Reset form
    setNewMemberPhone('');
    setNewMemberFellowship(Fellowship.Thyatira);
  };

  const openQuickAdd = () => {
    setNewMemberName(searchTerm);
    setIsAddMemberOpen(true);
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setSearchTerm('');
    // Focus amount input instantly
    setTimeout(() => amountInputRef.current?.focus(), 50);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedMember || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const newTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      batchId: 'BATCH-CURRENT',
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      fellowship: selectedMember.fellowship,
      amount: numAmount,
      method,
      timestamp: getSundayDate(parseInt(sessionYear), sessionMonth, sessionWeek), // Use Session Date
      officerId: user?.id || 'sys'
    };



    addTransaction(newTxn);

    // Reset
    setAmount('');
    setSelectedMember(null);
    setMethod(PaymentMethod.CASH);

    // Toast & Refocus
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    searchInputRef.current?.focus();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoLastTransaction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoLastTransaction]);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 md:gap-6 animate-fade-in pb-4 md:pb-4 w-full max-w-full overflow-x-hidden px-4 md:px-0 box-border h-auto md:max-h-[calc(100vh-180px)] overflow-y-auto pb-[120px] md:pb-8">
      {/* Left Panel - Entry Form */}
      <div className="w-full lg:w-5/12 flex flex-col h-auto bg-white rounded-3xl p-4 md:p-6 pb-6 md:pb-16 relative border-gray-200 mx-auto lg:mx-0 max-w-full shadow-sm">
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
              {/* Fiscal Year - Standardized Layout */}
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

              {/* Month - 6 Column Grid (Squeezed) */}
              <div className="w-full">
                <label className="block text-[10px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-1 text-left">Month</label>
                <div className="flex flex-wrap gap-2 w-full mb-4 md:mb-2">
                  {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSessionMonth(m)}
                      className={`flex-1 min-w-[70px] py-2 md:py-1 rounded-lg text-[10px] md:text-[10px] font-bold transition-all flex items-center justify-center ${sessionMonth === m
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Week - 5 Column Grid (Left Aligned) */}
              <div className="w-full">
                <label className="block text-[10px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-1 text-left">Week Number</label>
                <div className="flex flex-wrap gap-2 w-full bg-slate-100 p-2 rounded-xl mb-4 md:mb-2">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSessionWeek(w)}
                      className={`flex-1 min-w-[40px] py-1.5 md:py-1 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center ${sessionWeek === w
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
                onClick={() => setIsSessionActive(true)}
                className="w-full bg-indigo-600 text-white font-bold py-3 md:py-2 rounded-xl text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center mt-2 mb-2 md:mt-1 active:scale-[0.98]"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Start Session
              </button>
            </div>
          </div>
        ) : (
          // TRANSACTION ENTRY VIEW
          <div className="flex flex-col h-auto animate-fade-in pb-0">
            {/* Session Header Banner */}
            <div className="bg-slate-900 rounded-2xl p-4 md:p-2.5 mb-6 md:mb-2 flex justify-between items-center text-white shadow-lg shadow-slate-200">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-0.5">Active Session</div>
                <div className="font-bold flex items-center">
                  <Calendar className="w-4 h-4 mr-2 opacity-75" />
                  {sessionMonth} {sessionYear} <span className="mx-2 opacity-50">|</span> Week {sessionWeek}
                </div>
              </div>
              <button
                onClick={() => setIsSessionActive(false)}
                className="bg-red-600 hover:bg-red-700 text-white p-2 md:p-1.5 rounded-lg transition-colors shadow-lg shadow-red-900/40 opacity-90 hover:opacity-100"
                title="End Session"
              >
                <Power className="w-4 h-4 md:w-3.5 md:h-3.5" />
              </button>
            </div>

            <div className="mb-2 md:mb-1">
              <h2 className="text-2xl md:text-lg font-bold text-[#1e1e2d]">New Transaction</h2>
              <p className="text-gray-400 text-sm md:text-[10px]">Record a new tithe or offering</p>
            </div>
            {/* 1. Member Search */}
            <div className="mb-8 md:mb-2 relative z-20">
              <div className="flex justify-between items-end mb-3 md:mb-1">
                <label className="block text-sm md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">1. Select Member</label>
                <button
                  onClick={() => {
                    setNewMemberName(''); // Clear any previous search term default
                    setIsAddMemberOpen(true);
                  }}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  New Member
                </button>
              </div>
              <div className="relative group">
                <Search className="absolute left-5 top-4 md:top-2.5 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={selectedMember ? selectedMember.name : searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedMember(null);
                  }}
                  placeholder="Type name or phone number..."
                  className={`w-full text-base md:text-sm font-medium border-2 rounded-xl md:rounded-lg py-2.5 md:py-1.5 pl-12 md:pl-12 pr-4 transition-all shadow-sm ${selectedMember
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-indigo-100'
                    : 'bg-white/50 border-slate-200 focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-100'
                    }`}
                />
              </div>

              {/* Dropdown Results */}
              {!selectedMember && searchTerm.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 max-h-80 overflow-y-auto z-50 p-2">
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleMemberSelect(m)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl flex items-center justify-between group transition-colors mb-1"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-indigo-700">{m.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{m.phone}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500 group-hover:bg-white group-hover:shadow-sm">{m.fellowship}</span>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="p-4">
                      <div className="text-center text-slate-400 text-sm font-medium mb-3">No members found matching "{searchTerm}"</div>
                      <button
                        onClick={openQuickAdd}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center transition-colors shadow-lg shadow-indigo-200"
                      >
                        <UserPlus className="w-5 h-5 mr-2" />
                        Add "{searchTerm}" as New Member
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Add Modal */}
            {isAddMemberOpen && createPortal(
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
                onClick={() => setIsAddMemberOpen(false)}
              >
                <div
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-[#1e1e2d] px-4 md:px-8 py-4 md:py-6 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Add New Member</h3>
                    <button onClick={() => setIsAddMemberOpen(false)} className="text-white/50 hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-4 md:p-8 space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
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
                        onClick={handleQuickAdd}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                      >
                        Save & Select Member
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* 2. Amount Input */}
            <div className="flex flex-col justify-center mb-4 md:mb-2 relative py-2 md:py-0">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/30 to-transparent rounded-3xl -z-10 opacity-0 transition-opacity duration-500" style={{ opacity: selectedMember ? 1 : 0 }}></div>
              <label className="block text-sm md:text-[10px] font-bold text-slate-500 mb-2 md:mb-1 text-center uppercase tracking-wider">2. Enter Amount</label>
              <div className="flex items-center justify-center px-4 md:px-8">
                <span className={`text-2xl md:text-3xl font-bold transition-colors duration-300 mr-1 md:mr-2 ${amount ? 'text-indigo-300' : 'text-slate-200'}`}>GH₵</span>
                <input
                  ref={amountInputRef}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="flex-1 bg-transparent text-center text-4xl md:text-5xl font-black text-indigo-900 focus:outline-none placeholder-slate-200 drop-shadow-sm min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-2 md:py-0"
                  placeholder="0.00"
                  disabled={!selectedMember}
                />
              </div>
            </div>

            {/* 3. Method Selection */}
            <div className="flex justify-center gap-2 md:gap-2 mb-6 md:mb-2 w-full">
              {[PaymentMethod.CASH, PaymentMethod.MOMO].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex-1 py-3 md:py-2 rounded-xl md:rounded-lg font-bold text-xs md:text-[10px] transition-all relative overflow-hidden ${method === m
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 scale-105 ring-4 ring-indigo-50'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                >
                  {method === m && <div className="absolute inset-0 bg-white/20"></div>}
                  {m}
                </button>
              ))}
            </div>

            <div className="flex justify-center w-full">
              <button
                onClick={() => handleSubmit()}
                disabled={!selectedMember || !amount}
                className="w-full md:w-56 bg-slate-900 text-white font-bold py-3.5 md:py-2.5 rounded-xl md:rounded-lg text-sm md:text-sm flex items-center justify-center shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-indigo-900/20 hover:bg-indigo-900 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Check className="w-5 h-5 md:w-5 md:h-5 mr-2" />
                CONFIRM TRANSACTION
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6 font-medium">
              Press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">ENTER</kbd> to submit • <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">CTRL+Z</kbd> to undo
            </p>
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
    </div>
  );
};
