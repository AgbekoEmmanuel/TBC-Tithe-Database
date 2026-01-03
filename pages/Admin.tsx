import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader, Database, Save } from 'lucide-react';
import { parseExcelData } from '../lib/importUtils';
import { useDataStore } from '../store';
import { Member, Transaction } from '../types';

export const Admin: React.FC = () => {
    const { importData, isLoading } = useDataStore();
    const [file, setFile] = useState<File | null>(null);
    const [year, setYear] = useState('2025');
    const [preview, setPreview] = useState<{ members: Member[], transactions: Transaction[], warnings: string[] } | null>(null);
    const [importStatus, setImportStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');

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

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">System Administration</h2>
                <p className="text-slate-500 font-medium mt-1">Manage data imports and system settings</p>
            </div>

            <div className="glass-card p-8">
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
        </div>
    );
};
