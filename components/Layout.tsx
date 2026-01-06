import React, { useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Sidebar } from './Sidebar';
import pheebsProfile from '../src/images/pheebs.jpg';
import serwaaProfile from '../src/images/serwaacrop.jpg';
import { supabase } from '../lib/supabaseClient';
import { Loader, Camera, X, User, Mail, Shield } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, checkAuth } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    setIsProfileOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setIsUploading(true);
    try {
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 4. Refresh State
      await checkAuth();

    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to get current avatar source
  const getAvatarSrc = () => {
    if (user?.email === 'admin@tbc.com') return pheebsProfile;
    if (user?.name?.toLowerCase().includes('serwaa')) return serwaaProfile;
    if (user?.avatarUrl) return user.avatarUrl;
    return null;
  };

  const avatarSrc = getAvatarSrc();

  return (
    <div className="flex h-screen bg-[#1e1e2d]">
      <Sidebar />
      <div className="flex-1 p-4 h-screen overflow-hidden ml-14 md:ml-0">
        <div className="floating-container p-8 animate-fade-in relative z-0">
          {/* Header Area */}
          <header className="flex justify-between items-center mb-6 md:mb-10 transition-all">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-[#1e1e2d] whitespace-nowrap">Hi, {user?.name || 'User'}</h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="bg-white rounded-xl py-2 md:py-3 px-3 md:pl-4 pl-3 md:pr-12 pr-8 w-32 md:w-64 focus:outline-none shadow-sm text-xs md:text-sm transition-all"
                />
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 absolute right-2 md:right-4 top-2 md:top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <button className="bg-white p-2 md:p-3 rounded-xl shadow-sm hover:bg-gray-50">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>

              <button
                onClick={handleAvatarClick}
                className="w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden shadow-sm transition-transform hover:scale-105 focus:outline-none ring-2 ring-transparent hover:ring-indigo-400"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
                  </div>
                )}
              </button>
            </div>
          </header>

          <main>
            <Outlet />
          </main>

          {/* Profile Modal */}
          {isProfileOpen && user && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              onClick={() => setIsProfileOpen(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in relative"
                onClick={(e) => e.stopPropagation()}
              >

                {/* Close Button */}
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                {/* Avatar Section */}
                <div className="px-6 -mt-12 flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg ring-4 ring-white/50">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full bg-indigo-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Camera Upload Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute bottom-[-10px] right-[-10px] bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all border border-slate-100"
                      title="Upload New Picture"
                    >
                      {isUploading ? <Loader className="w-5 h-5 animate-spin text-indigo-600" /> : <Camera className="w-5 h-5" />}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>

                  <h2 className="mt-4 text-xl font-bold text-slate-800 text-center">{user.name}</h2>
                  <p className="text-slate-500 text-sm font-medium bg-slate-100 px-3 py-1 rounded-full mt-1">
                    {user.role}
                  </p>
                </div>

                {/* Read-Only Details */}
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center ml-1">
                      <Mail className="w-3 h-3 mr-1" />
                      Email Address
                    </label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium">
                      {user.email}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center ml-1">
                      <Shield className="w-3 h-3 mr-1" />
                      Account Role
                    </label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium">
                      {user.role}
                    </div>
                  </div>

                  <p className="text-xs text-center text-slate-400 italic mt-4">
                    Account details are managed by the Administrator. Only the profile picture can be changed here.
                  </p>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
