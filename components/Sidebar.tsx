import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-6 py-4 mx-4 rounded-xl transition-all duration-200 ${isActive
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
      : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <div className="w-24 h-full flex flex-col items-center bg-[#1e1e2d] py-8">
      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-10 shadow-lg shadow-indigo-500/10">
        <PieChart className="text-indigo-600 w-7 h-7" />
      </div>

      <nav className="flex-1 w-full flex flex-col items-center space-y-6">
        <NavLink to="/dashboard" className={({ isActive }) => `p-3.5 rounded-xl transition-all ${isActive ? 'bg-orange-100 text-orange-500' : 'text-gray-400 hover:text-white'}`}>
          <LayoutDashboard className="w-6 h-6" />
        </NavLink>

        <NavLink to="/operations/entry" className={({ isActive }) => `p-3.5 rounded-xl transition-all ${isActive ? 'bg-indigo-100 text-indigo-500' : 'text-gray-400 hover:text-white'}`}>
          <PlusCircle className="w-6 h-6" />
        </NavLink>

        {user?.role === Role.SUPERVISOR && (
          <NavLink to="/operations/reconcile" className={({ isActive }) => `p-3.5 rounded-xl transition-all ${isActive ? 'bg-emerald-100 text-emerald-500' : 'text-gray-400 hover:text-white'}`}>
            <Wallet className="w-6 h-6" />
          </NavLink>
        )}

        <NavLink to="/directory" className={({ isActive }) => `p-3.5 rounded-xl transition-all ${isActive ? 'bg-blue-100 text-blue-500' : 'text-gray-400 hover:text-white'}`}>
          <Users className="w-6 h-6" />
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `p-3.5 rounded-xl transition-all ${isActive ? 'bg-purple-100 text-purple-500' : 'text-gray-400 hover:text-white'}`}>
          <PieChart className="w-6 h-6" />
        </NavLink>

        {user?.role === Role.SUPERVISOR && (
          <NavLink to="/admin" className={({ isActive }) => `p-3.5 rounded-xl transition-all ${isActive ? 'bg-red-100 text-red-500' : 'text-gray-400 hover:text-white'}`}>
            <ShieldCheck className="w-6 h-6" />
          </NavLink>
        )}
      </nav>

      <div className="mb-4">
        <button
          onClick={handleLogout}
          className="p-3 text-gray-500 hover:text-white transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
