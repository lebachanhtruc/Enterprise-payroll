import React, { useRef, useState } from 'react';
import { FileInput, Upload, Trash2, History, AlertTriangle, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { Employee, Timesheet, SystemSettings } from '../types';
import { useUI } from '../contexts/UIContext';

interface ImportDataProps {
    employees: Employee[];
    timesheets: Record<number, Timesheet>;
    settings: SystemSettings;
    pastData: any;
    setPastData: React.Dispatch<React.SetStateAction<any>>;
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
    setTimesheets: React.Dispatch<React.SetStateAction<Record<number, Timesheet>>>;
    setActiveTab: (tab: string) => void;
    isLocked?: boolean;
}

export default function ImportData({ employees, timesheets, settings, pastData, setPastData, setEmployees, setSettings, setTimesheets, setActiveTab, isLocked }: ImportDataProps) {
    const { showToast, showConfirm } = useUI();

    const handleImportMenu = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        try {
            const file = e.target.files[0];
            const text = await file.text();
            const data = JSON.parse(text);
            if (data.employees && data.timesheets) {
                setPastData(data);
                setEmployees(data.employees);
                
                const startVal = data.settings.periodStart || '2026-03-30';
                const nextStart = new Date(startVal + 'T12:00:00Z');
                nextStart.setDate(nextStart.getDate() + 14);
                
                const nextEnd = new Date(data.settings.periodEnd + 'T12:00:00Z');
                nextEnd.setDate(nextEnd.getDate() + 14);
                
                setSettings((prev: SystemSettings) => ({
                    ...prev,
                    periodStart: nextStart.toISOString().split('T')[0],
                    periodEnd: nextEnd.toISOString().split('T')[0],
                    companyName: data.settings.companyName || prev.companyName
                }));

                const newTs: Record<number, Timesheet> = {};
                if (data.payrollData) {
                    data.payrollData.forEach((d: any) => {
                        if (d.carryForwardBalance > 0) {
                            newTs[d.id] = { w1H: '', w1C: '', w1K: '', w2H: '', w2C: '', w2K: '', prevDebt: d.carryForwardBalance };
                        }
                    });
                }
                setTimesheets(newTs);
                showToast('Data restored and carried forward successfully!', 'success');
                setActiveTab('input');
            }
        } catch (err) {
            showToast('Error loading file, please try again', 'error');
        }
        e.target.value = '';
    };

    const handleDeleteImport = async () => {
        const confirmed = await showConfirm(
            'Delete Import Data?',
            'Confirm to delete previous period data and reset carry-forward debt?'
        );
        if (confirmed) {
            setPastData(null);
            setTimesheets((prev: Record<number, Timesheet>) => {
                const newTs = { ...prev };
                Object.keys(newTs).forEach(id => {
                    const tsId = Number(id);
                    if (newTs[tsId]) newTs[tsId] = { ...newTs[tsId], prevDebt: 0 } as any;
                });
                return newTs;
            });
            showToast('Previous import data deleted.', 'info');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                <div className="bg-indigo-50 text-indigo-600 p-5 rounded-2xl mb-6 shadow-sm border border-indigo-100 flex items-center justify-center w-20 h-20">
                    <FileInput size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Initialize New Cycle</h3>
                <p className="text-slate-500 mb-8 max-w-sm text-sm text-center">
                    Upload the JSON backup from your previous period to automatically carry forward balances and set up dates for this cycle.
                </p>
                <input disabled={isLocked} type="file" id="json-upload" accept=".json" className="hidden" onChange={handleImportMenu} />
                <div className="flex flex-col gap-3 w-full max-w-sm">
                    <button title={isLocked ? "Cycle locked" : "Import previous payroll JSON data to populate the current cycle"} 
                        onClick={() => !isLocked && document.getElementById('json-upload')?.click()} 
                        disabled={isLocked}
                        className={`w-full font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        <Upload size={18} /> Upload JSON Data
                    </button>
                    
                    
                </div>
                {pastData && (
                    <button title={isLocked ? "Cycle locked" : "Clear all current initialized data and start fresh"} 
                        onClick={handleDeleteImport} 
                        disabled={isLocked}
                        className={`w-full max-w-sm mt-3 font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm border border-transparent ${isLocked ? 'text-slate-400 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50 hover:border-rose-200'}`}
                    >
                        <Trash2 size={16} /> Delete Imported Data
                    </button>
                )}
            </div>
            {pastData && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
                    <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-black text-indigo-900 text-xl flex items-center gap-2">
                                <History size={24} className="text-indigo-500" /> Previous Period Data Table (Read Only)
                            </h3>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-lg font-bold text-indigo-700 text-sm border border-slate-200 shadow-sm">
                            {format(parseISO(pastData.settings.periodStart), 'dd/MM/yyyy')} - {format(parseISO(pastData.settings.periodEnd), 'dd/MM/yyyy')}
                        </div>
                    </div>
                    <div className="hidden lg:block overflow-x-auto opacity-80 w-full relative">
                        <table className="w-full text-left min-w-[850px] table-fixed">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="px-5 py-3 w-48 sticky left-0 z-20 bg-slate-800 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.15)]" rowSpan={2}>Employee Name</th>
                                    <th className="px-4 py-2 text-center bg-indigo-800 border-l border-slate-700 w-36" colSpan={3}>Week 1</th>
                                    <th className="px-4 py-2 text-center bg-teal-800 border-l border-slate-700 w-36" colSpan={3}>Week 2</th>
                                    <th className="px-4 py-2 text-center bg-amber-700 border-l border-slate-700 w-96" colSpan={3}>2-Week Total</th>
                                </tr>
                                <tr className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 border-b border-slate-800">
                                    <th className="px-2 py-2 text-center bg-indigo-900/50 border-l border-slate-800">Hours</th>
                                    <th className="px-2 py-2 text-center bg-indigo-900/50">Cash Addon</th>
                                    <th className="px-2 py-2 text-center bg-indigo-900/50">Card Addon</th>
                                    <th className="px-2 py-2 text-center bg-teal-900/50 border-l border-slate-800">Hours</th>
                                    <th className="px-2 py-2 text-center bg-teal-900/50">Cash Addon</th>
                                    <th className="px-2 py-2 text-center bg-teal-900/50">Card Addon</th>
                                    <th className="px-2 py-2 text-center bg-amber-900/50 border-l border-slate-800">Total Hours</th>
                                    <th className="px-2 py-2 text-center bg-amber-900/50">Total Addons</th>
                                    <th className="px-2 py-2 text-center bg-rose-900/50 text-rose-300">Carry-forward Debt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pastData.employees.map((emp: Employee) => {
                                    if (emp.rule.type.includes('_IN_')) return null;
                                    const ts = pastData.timesheets[emp.id] || {};
                                    const pr = pastData.payrollData?.find((p: any) => p.id === emp.id);
                                    const tH = pr?.totalHrs || (parseFloat(ts.w1H as string) || 0) + (parseFloat(ts.w2H as string) || 0);
                                    const cF = pr?.carryForwardBalance > 0 ? pr.carryForwardBalance : '';
                                    return (
                                        <tr key={emp.id} className="border-b border-slate-100 bg-white">
                                            <td className="px-5 py-4 font-bold text-slate-800 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{emp.nickname}</td>
                                            <td className="p-2 text-right bg-indigo-50/20 font-bold">{ts.w1H || '-'}</td>
                                            <td className="p-2 text-right bg-indigo-50/20 text-indigo-600">{ts.w1C ? `$${ts.w1C}` : '-'}</td>
                                            <td className="p-2 text-right bg-indigo-50/20 text-indigo-600">{ts.w1K ? `$${ts.w1K}` : '-'}</td>
                                            <td className="p-2 text-right bg-teal-50/20 font-bold">{ts.w2H || '-'}</td>
                                            <td className="p-2 text-right bg-teal-50/20 text-indigo-600">{ts.w2C ? `$${ts.w2C}` : '-'}</td>
                                            <td className="p-2 text-right bg-teal-50/20 text-indigo-600">{ts.w2K ? `$${ts.w2K}` : '-'}</td>
                                            <td className="p-2 text-right bg-amber-50/20 font-black text-amber-700">{tH > 0 ? tH : '-'}</td>
                                            <td className="p-2 text-right bg-amber-50/20 font-bold text-amber-600">{pr?.totalTips ? `$${pr.totalTips}` : '-'}</td>
                                            <td className="p-2 text-right bg-amber-50/20 font-bold text-rose-600">{cF ? `$${cF.toFixed(2)}` : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4 p-4 opacity-90 bg-slate-50">
                        {pastData.employees.map((emp: Employee) => {
                            if (emp.rule.type.includes('_IN_')) return null;
                            const ts = pastData.timesheets[emp.id] || {};
                            const pr = pastData.payrollData?.find((p: any) => p.id === emp.id);
                            const tH = pr?.totalHrs || (parseFloat(ts.w1H as string) || 0) + (parseFloat(ts.w2H as string) || 0);
                            const cF = pr?.carryForwardBalance > 0 ? pr.carryForwardBalance : '';
                            return (
                                <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                        <div>
                                            <h4 className="font-black text-slate-800 text-lg">{emp.nickname}</h4>
                                            <p className="text-xs text-slate-500">{emp.taxName}</p>
                                        </div>
                                        {cF && <span className="bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded text-xs border border-rose-200">Debt: ${Number(cF).toFixed(2)}</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                                            <div className="text-[10px] font-bold text-indigo-800 uppercase mb-2">Week 1</div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Hours</span><span className="font-bold">{ts.w1H || '-'}</span></div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Cash</span><span className="font-bold text-indigo-600">{ts.w1C ? `$${ts.w1C}` : '-'}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-500">Card</span><span className="font-bold text-indigo-600">{ts.w1K ? `$${ts.w1K}` : '-'}</span></div>
                                        </div>
                                        <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100/50">
                                            <div className="text-[10px] font-bold text-teal-800 uppercase mb-2">Week 2</div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Hours</span><span className="font-bold">{ts.w2H || '-'}</span></div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Cash</span><span className="font-bold text-teal-600">{ts.w2C ? `$${ts.w2C}` : '-'}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-500">Card</span><span className="font-bold text-teal-600">{ts.w2K ? `$${ts.w2K}` : '-'}</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex justify-between items-center">
                                        <div>
                                            <div className="text-[10px] font-bold text-amber-800 uppercase">Total Hours</div>
                                            <div className="font-black text-amber-700">{tH > 0 ? tH : '-'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-amber-800 uppercase">Total Addons</div>
                                            <div className="font-black text-amber-700">{pr?.totalTips ? `$${pr.totalTips}` : '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
