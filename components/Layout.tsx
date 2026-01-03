import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-[#1e1e2d]">
      <Sidebar />
      <div className="flex-1 p-4 h-screen overflow-hidden">
        <div className="floating-container p-8 animate-fade-in">
          {/* Header Area - Mimicking the reference */}
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold text-[#1e1e2d]">Hi, Ronald</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="bg-white rounded-xl py-3 px-6 pl-6 pr-12 w-64 focus:outline-none shadow-sm text-sm"
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <button className="bg-white p-3 rounded-xl shadow-sm hover:bg-gray-50">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>
              <div className="w-10 h-10 rounded-xl bg-yellow-300 overflow-hidden shadow-sm">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ronald" alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </header>

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
