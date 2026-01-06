import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import tbcLogo from '../src/images/tbc logo crop.png';
import tbcLogoFull from '../src/images/TBC logo full.png';
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  PieChart,
  Settings,
  LogOut,
  Wallet,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../store';
import { Role } from '../types';

export const Sidebar: React.FC = () => {
  // Force rebuild
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative group p-3.5 rounded-xl transition-all flex items-center ${isExpanded ? 'space-x-4 px-4' : 'justify-center'} ${isActive
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
      : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`;

  // Helper for Nav Items to reduce redundancy
  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <NavLink to={to} className={({ isActive }) => {
      // Custom active colors per specific routes if we want to keep the multicolor theme
      // But standardizing might be cleaner for the expanded list. 
      // Let's keep the user's multicolor preference but adapt layout.
      let colorClass = 'text-gray-400 hover:text-white';
      if (isActive) {
        if (to === '/dashboard') colorClass = 'bg-orange-100 text-orange-500';
        else if (to === '/operations/entry') colorClass = 'bg-indigo-100 text-indigo-500';
        else if (to === '/operations/reconcile') colorClass = 'bg-emerald-100 text-emerald-500';
        else if (to === '/directory') colorClass = 'bg-blue-100 text-blue-500';
        else if (to === '/analytics') colorClass = 'bg-purple-100 text-purple-500';
        else if (to === '/admin') colorClass = 'bg-red-100 text-red-500';
      }

      return `relative group ${isExpanded ? 'p-3.5' : 'p-2'} rounded-xl transition-all flex items-center ${isExpanded ? 'space-x-3 w-full px-4' : 'justify-center'} ${colorClass}`;
    }}>
      <Icon className="w-6 h-6 flex-shrink-0" />
      {isExpanded && <span className="font-bold whitespace-nowrap overflow-hidden">{label}</span>}

      {!isExpanded && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-slate-800 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {label}
        </div>
      )}
    </NavLink>
  );

  return (
    <div className={`${isExpanded ? 'w-64' : 'w-14'} h-full flex flex-col items-center bg-[#1e1e2d] py-8 transition-all duration-300 ease-in-out fixed md:relative z-50`}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${isExpanded ? 'w-48 h-16' : 'w-10 h-10'} bg-white rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-indigo-500/10 p-2 overflow-hidden cursor-pointer transition-all duration-300`}
      >
        <img
          src={isExpanded ? tbcLogoFull : tbcLogo}
          alt="TBC Logo"
          className="w-full h-full object-contain transition-all duration-300"
        />
      </div>

      <nav className={`flex-1 w-full flex flex-col items-center space-y-4 ${isExpanded ? 'px-4' : 'px-2'}`}>
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/operations/entry" icon={PlusCircle} label="New Entry" />

        {user?.role === Role.SUPERVISOR && (
          <NavItem to="/operations/reconcile" icon={Wallet} label="Reconcile" />
        )}

        <NavItem to="/directory" icon={Users} label="Member Directory" />
        <NavItem to="/analytics" icon={PieChart} label="Analytics" />
        <NavItem to="/admin" icon={ShieldCheck} label="Admin & Import" />
      </nav>

      <div className="mb-4 w-full px-4">
        <button
          onClick={handleLogout}
          className={`w-full p-3 text-gray-500 hover:text-white transition-colors flex items-center ${isExpanded ? 'space-x-3 px-4 hover:bg-white/5 rounded-xl' : 'justify-center'}`}
        >
          <LogOut className="w-6 h-6 flex-shrink-0" />
          {isExpanded && <span className="font-bold">Logout</span>}
        </button>
      </div>
    </div>
  );
};
