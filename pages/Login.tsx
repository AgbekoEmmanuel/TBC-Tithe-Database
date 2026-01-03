import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      login(email);
      navigate('/dashboard');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden p-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
            <PieChart className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 mt-2 text-center">
            Sign in to the Churchify Tithing Platform
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@church.com"
                className="w-full bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-slate-800 transition-all font-medium"
                required
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">Try: officer@church.com or supervisor@church.com</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-slate-800 transition-all font-medium"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-200 disabled:opacity-70"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Secure Login</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => {
              login('supervisor@church.com');
              navigate('/dashboard');
            }}
            className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 rounded-2xl transition-all flex items-center justify-center text-sm"
          >
            Developer Bypass (Supervisor)
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Protected by Churchify Secure Identity. <br/>
            Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};
