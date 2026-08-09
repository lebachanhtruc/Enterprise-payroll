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
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-6">
                    <FileInput size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Cycle Initialization</h3>
                <p className="text-slate-500 mb-8 max-w-sm text-base">
                    Upload last week json file to automatically load carry-forward balance and setup dates for the new period.
                </p>
                <input disabled={isLocked} type="file" id="json-upload" accept=".json" className="hidden" onChange={handleImportMenu} />
                <div className="flex flex-col gap-3 w-full max-w-md">
                    <button title={isLocked ? "Cycle locked" : "Import previous payroll JSON data to populate the current cycle"} 
                        onClick={() => !isLocked && document.getElementById('json-upload')?.click()} 
                        disabled={isLocked}
                        className={`w-full font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-lg shadow-sm ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        <Upload size={20} /> Load File (.json)
                    </button>
                    
                    
                </div>
                {pastData && (
                    <button title={isLocked ? "Cycle locked" : "Clear all current initialized data and start fresh"} 
                        onClick={handleDeleteImport} 
                        disabled={isLocked}
                        className={`w-full max-w-md mt-4 font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                    >
                        <Trash2 size={20} /> Delete Previous Import
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
                    <div className="overflow-x-auto opacity-80 w-full relative">
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
                </div>
            )}
        </div>
    );
}
