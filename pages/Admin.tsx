import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader, Database, Save, Edit, X, Lock } from 'lucide-react';
import { parseExcelData } from '../lib/importUtils';
import { exportToExcel } from '../lib/exportUtils';
import { useDataStore, useAuthStore } from '../store';
import { supabase } from '../lib/supabaseClient';
import { Member, Transaction } from '../types';

export const Admin: React.FC = () => {
    const { user } = useAuthStore();
    const { importData, isLoading } = useDataStore();
    const [file, setFile] = useState<File | null>(null);
    const [year, setYear] = useState('2025');
    const [preview, setPreview] = useState<{ members: Member[], transactions: Transaction[], warnings: string[] } | null>(null);
    const [importStatus, setImportStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');

    // User Management State
    const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'OFFICER' });
    const [userCreationStatus, setUserCreationStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [userCreationMessage, setUserCreationMessage] = useState('');
    const [users, setUsers] = useState<any[]>([]);

    // Edit State
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ email: '', password: '', name: '', role: 'OFFICER' });
    const [updateStatus, setUpdateStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [updateMessage, setUpdateMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        // Start names fetch? Not stored in profile. We can't easily get names for table without Edge Function or metadata hack.
        // For now, list just what we have.
        if (data) setUsers(data);
    };

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setEditForm({
            email: user.email,
            password: '', // Don't show existing password
            name: '', // We don't have name in local profile table easily available unless we fetch it. 
            // User can enter new name.
            role: user.role
        });
        setUpdateStatus('IDLE');
        setUpdateMessage('');
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateStatus('IDLE');

        try {
            const { error } = await supabase.rpc('update_user_admin', {
                target_user_id: editingUser.id,
                new_email: editForm.email,
                new_password: editForm.password,
                new_data: { name: editForm.name, role: editForm.role }
            });

            if (error) throw error;

            setUpdateStatus('SUCCESS');
            setUpdateMessage('User updated successfully.');
            setEditingUser(null);
            fetchUsers(); // Refresh list
        } catch (err: any) {
            console.error(err);
            setUpdateStatus('ERROR');
            setUpdateMessage(err.message || 'Failed to update user. Did you run the SQL script?');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreview(null);
            setImportStatus('IDLE');
        }
    };

    const handlePreview = async () => {
        if (!file) return;
        try {
            const data = await parseExcelData(file, year);
            setPreview(data);
        } catch (err: any) {
            setErrorMessage(err.message);
            setImportStatus('ERROR');
        }
    };

    const handleImport = async () => {
        if (!preview) return;

        const result = await importData(preview.members, preview.transactions);

        if (result.success) {
            setImportStatus('SUCCESS');
            setFile(null);
            setPreview(null);
        } else {
            setImportStatus('ERROR');
            setErrorMessage(result.error || 'Unknown error');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserCreationStatus('IDLE');

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const tempUrl = import.meta.env.VITE_SUPABASE_URL;
            const tempKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const tempSupabase = createClient(tempUrl, tempKey, {
                auth: { persistSession: false }
            });

            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email: newUser.email,
                password: newUser.password,
                options: {
                    data: {
                        role: newUser.role,
                        name: newUser.name
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                const { supabase } = await import('../lib/supabaseClient');

                const { error: profileError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    email: newUser.email,
                    role: newUser.role
                });

                if (profileError) {
                    console.warn('Profile creation failed (might already exist or RLS issue):', profileError);
                }
            }

            setUserCreationStatus('SUCCESS');
            setNewUser({ email: '', password: '', name: '', role: 'OFFICER' });
            setUserCreationMessage(`User ${newUser.email} created successfully.`);
            fetchUsers();

        } catch (err: any) {
            setUserCreationStatus('ERROR');
            setUserCreationMessage(err.message);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in p-2 md:p-8 pb-32">
            {/* Universal Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Administration</h1>
                    <p className="text-slate-500 font-medium">Manage users, import historical data, and export records.</p>
                </div>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm border border-indigo-100 uppercase tracking-wider">
                    {user?.role} ACCESS
                </div>
            </div>

            {/* User Management Section - RESTRICTED TO SUPERVISORS */}
            {user?.role === 'SUPERVISOR' && (
                <div className="glass-card p-4 md:p-8">
                    <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-slate-100">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">User Management</h3>
                            <p className="text-slate-500 text-sm">Create new users and assign roles</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateUser} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Email Address</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Password</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Display Name</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="OFFICER">Officer (Standard)</option>
                                    <option value="SUPERVISOR">Supervisor (Admin)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            {userCreationStatus === 'SUCCESS' && (
                                <span className="text-emerald-600 font-bold text-sm flex items-center">
                                    <Check className="w-4 h-4 mr-1" /> {userCreationMessage}
                                </span>
                            )}
                            {userCreationStatus === 'ERROR' && (
                                <span className="text-red-500 font-bold text-sm flex items-center">
                                    <AlertTriangle className="w-4 h-4 mr-1" /> {userCreationMessage}
                                </span>
                            )}
                            <button
                                type="submit"
                                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 ml-auto"
                            >
                                Create User
                            </button>
                        </div>
                    </form>
                    {/* Users List */}
                    <div className="border-t border-slate-100 pt-8 mt-8">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-xs">
                                {users.length}
                            </div>
                            Registered Officers
                        </h4>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 w-full max-w-[calc(100vw-4rem)] md:max-w-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                        <th className="p-4 font-bold">Email</th>
                                        <th className="p-4 font-bold">Role</th>
                                        <th className="p-4 font-bold">Joined</th>
                                        <th className="p-4 font-bold text-right">Status</th>
                                        <th className="p-4 font-bold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                                No users found other than yourself.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-slate-700 font-bold">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'SUPERVISOR'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-500 text-sm">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="text-emerald-600 font-bold text-xs flex items-center justify-end">
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Edit User</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                                    <span>New Password</span>
                                    <span className="text-xs text-amber-600 normal-case font-normal flex items-center">
                                        <Lock className="w-3 h-3 mr-1" />
                                        Leave blank to keep current
                                    </span>
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-300"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    placeholder="e.g. Officer One"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none"
                                >
                                    <option value="OFFICER">Officer</option>
                                    <option value="SUPERVISOR">Supervisor (Admin)</option>
                                </select>
                            </div>

                            {/* Feedback */}
                            {updateStatus === 'ERROR' && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start">
                                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                                    {updateMessage}
                                </div>
                            )}

                            {updateStatus === 'SUCCESS' && (
                                <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg flex items-center">
                                    <Check className="w-4 h-4 mr-2" />
                                    {updateMessage}
                                </div>
                            )}

                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Legacy Import Section */}
            <div className="glass-card p-4 md:p-8">
                <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Legacy Data Import</h3>
                        <p className="text-slate-500 text-sm">Import historical tithe records from Excel</p>
                    </div>
                </div>

                {importStatus === 'SUCCESS' ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-emerald-900 mb-2">Import Successful!</h3>
                        <p className="text-emerald-700 mb-6">Your data has been securely saved to the database.</p>
                        <button
                            onClick={() => setImportStatus('IDLE')}
                            className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                        >
                            Import More Data
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">1. Select Fiscal Year</label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                                <p className="text-xs text-slate-400 mt-2">Determines the year for the imported dates.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">2. Upload Excel File</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`border-2 border-dashed rounded-xl p-4 flex items-center justify-center transition-all ${file ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50'}`}>
                                        {file ? (
                                            <div className="flex items-center text-indigo-700 font-bold">
                                                <FileSpreadsheet className="w-5 h-5 mr-2" />
                                                {file.name}
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-slate-400 font-medium">
                                                <Upload className="w-5 h-5 mr-2" />
                                                <span>Click to browse...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            {!preview ? (
                                <button
                                    onClick={handlePreview}
                                    disabled={!file}
                                    className="flex items-center space-x-2 bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Database className="w-5 h-5" />
                                    <span>Analyze Data</span>
                                </button>
                            ) : (
                                <div className="w-full">
                                    <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
                                        <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                                            <FileSpreadsheet className="w-5 h-5 mr-2 text-indigo-500" />
                                            Import Summary
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                                <div className="text-3xl font-black text-slate-800">{preview.members.length}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase">Members Found</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                                <div className="text-3xl font-black text-emerald-600">{preview.transactions.length}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase">Transactions Found</div>
                                            </div>
                                        </div>

                                        {preview.warnings.length > 0 && (
                                            <div className="mt-4 bg-amber-50 text-amber-800 p-4 rounded-lg text-sm border border-amber-100">
                                                <p className="font-bold flex items-center mb-2">
                                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                                    Warnings
                                                </p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {preview.warnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                                                    {preview.warnings.length > 3 && <li>...and {preview.warnings.length - 3} more</li>}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <button onClick={() => { setPreview(null); setFile(null); }} className="text-slate-500 font-bold hover:text-slate-700">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleImport}
                                            disabled={isLoading}
                                            className="flex items-center space-x-2 bg-emerald-600 text-white font-bold py-4 px-10 rounded-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-70"
                                        >
                                            {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span>{isLoading ? 'Importing...' : 'Confirm Import'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {importStatus === 'ERROR' && (
                            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 flex items-center justify-center font-medium animate-shake">
                                <AlertTriangle className="w-5 h-5 mr-2" />
                                {errorMessage}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Export Section */}
            <div className="glass-card p-4 md:p-8">
                <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Export & Backup</h3>
                        <p className="text-slate-500 text-sm">Download updated Excel file with latest records</p>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h4 className="text-lg font-bold text-blue-900 mb-2">Download Updated Database</h4>
                        <p className="text-blue-700 text-sm mb-4 max-w-md">
                            Generate a fresh Excel file containing all current members, transactions, and updated YTD totals.
                            This file matches the import format and can be used for future imports.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            // Fetch freshest data from store state
                            const { members, transactions } = useDataStore.getState();
                            exportToExcel(members, transactions, year);
                        }}
                        className="bg-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center whitespace-nowrap"
                    >
                        <FileSpreadsheet className="w-5 h-5 mr-2" />
                        Download Excel
                    </button>
                </div>
            </div>

        </div>
    );
};
