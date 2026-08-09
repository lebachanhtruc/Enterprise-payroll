import React, { useState, useEffect } from 'react';
import { Printer, Save } from 'lucide-react';
import { format, parseISO , addDays } from 'date-fns';
import { PayrollResult, ValidationLog, SystemSettings, Employee, Timesheet } from '../types';
import { formatCurrency, formatNumber, cn, handlePrint, hasSessionAnomaly } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { exportPayrollToExcel } from '../lib/excel-export';
import { exportPayrollToCSV } from '../lib/csv-export';
import { Skeleton } from './ui/Skeleton';

export default function Reports({ results, settings, employees, timesheets, isLoadingEmployees, isLocked, setIsLocked }: { results: PayrollResult[], settings: SystemSettings, employees: Employee[], timesheets: Record<number, Timesheet>, isLoadingEmployees?: boolean, isLocked?: boolean, setIsLocked?: (val: boolean) => void }) {
    const { showToast, showConfirm, isCompactMode } = useUI();
    const { role } = useAuth();
    const isSaveDisabled = role === 'MANAGER' || role === 'STAFF';
    const [reportType, setReportType] = useState('CHECK');
    const [reportView, setReportView] = useState('BOTH');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [auditLogs, setAuditLogs] = useState<ValidationLog[]>([]);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            if (!settings.companyId) return;
            try {
                const { data, error } = await supabase
                    .from('pos_validations')
                    .select('*, profiles:validated_by (email)')
                    .eq('company_id', settings.companyId)
                    .gte('log_date', settings.periodStart)
                    .lte('log_date', settings.periodEnd);
                    
                if (!error && data) {
                    setAuditLogs(data);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchAuditLogs();
    }, [settings.companyId, settings.periodStart, settings.periodEnd]);

    const executePayrollSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            if (results.length === 0) {
                const errTxt = 'Error: No payroll data to confirm.';
                setMessage({ type: 'error', text: errTxt });
                showToast(errTxt, 'error');
                return;
            }

            // Check if already exists
            // Backup JSON download (Execute first to ensure file is always downloadable even if DB fails)
            try {
                const data = { employees, timesheets, settings, payrollData: results };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                
                if ((window as any).showSaveFilePicker) {
                    try {
                        const handle = await (window as any).showSaveFilePicker({
                            suggestedName: `${settings.companyName.replace(/\s+/g, "_")}_Payroll_${settings.periodStart}_to_${settings.periodEnd}.json`,
                            types: [{
                                description: 'JSON File',
                                accept: { 'application/json': ['.json'] },
                            }],
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                    } catch (err: any) {
                        if (err.name !== 'AbortError') throw err;
                    }
                } else {
                    throw new Error('No showSaveFilePicker');
                }
            } catch (e) {
                // Fallback: Automatic default download
                const data = { employees, timesheets, settings, payrollData: results };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${settings.companyName.replace(/\s+/g, "_")}_Payroll_${settings.periodStart}_to_${settings.periodEnd}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            if (!settings.companyId) {
                showToast("Please select a company in '1. System Configuration' first.", "error");
                return;
            }
            const { count, error: checkError } = await supabase!
                .from('payroll_logs')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', settings.companyId)
                .eq('period_start', settings.periodStart)
                .eq('period_end', settings.periodEnd);
            
            if (checkError) throw checkError;

            if (count && count > 0) {
                const errTxt = 'Error: This payroll period has already been confirmed!';
                setMessage({ type: 'error', text: errTxt });
                showToast(errTxt, 'error');
                return;
            }

            const payload = results.map(r => ({
                emp_id: Number(r.id),
                company_id: settings.companyId,
                period_start: settings.periodStart,
                period_end: settings.periodEnd,
                total_hrs: Number(r.totalHrs || 0),
                standard_add_ons: Number(r.standardAddOns || 0),
                variable_bonus: Number(r.variableBonus || 0),
                carry_forward_balance: Number(r.carryForwardBalance || 0)
            }));

            // Removed .select() because if they only have an INSERT policy, select() will fail or return null.
            const { error: insertError } = await supabase!
                .from('payroll_logs')
                .insert(payload);

            if (insertError) throw insertError;
            // Log the locking action in pos_validations (Audit Ledger)
            const { error: auditError } = await supabase!
                .from('pos_validations')
                .insert({
                    company_id: settings.companyId,
                    log_date: settings.periodEnd,
                    employee_id: employees[0]?.id || null, // placeholder if needed
                    session_id: 'SYSTEM_LOCK',
                    action_type: 'Payroll cycle locked / confirmed',
                    validated_by: (await supabase!.auth.getUser()).data.user?.id
                });
            if (auditError) console.warn('Failed to log audit action', auditError);

            const successMsg = 'Success! Payroll confirmed and locked.';
            setMessage({ type: 'success', text: successMsg });
            showToast(successMsg, 'success');
            if (setIsLocked) {
                setIsLocked(true);
            }
        } catch (error: any) {
            console.warn('Error confirming payroll - FULL ERROR:', error);
            setMessage({ type: 'error', text: `Error saving to Supabase: ${error.message || JSON.stringify(error)}` });
            showToast(`Error saving to database: ${error.message || 'unknown error'}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveClick = async () => {
        let hasUnvalidated = false;
        for (const emp of employees) {
            if (emp.rule?.type && emp.rule.type.includes('_IN_')) {
                continue;
            }
            const ts = timesheets[emp.id];
            
            const isFixed = emp.rule?.type === 'FIXED_TOTAL';
            const isUnlocked = !!ts?.isUnlocked;
            if (isFixed && !isUnlocked) {
                continue;
            }

            if (ts?.posLogs) {
                if (ts.posLogs.some((log: any) => hasSessionAnomaly(log.sessions, log.isValidated))) {
                    hasUnvalidated = true;
                    break;
                }
            }
        }

        if (hasUnvalidated) {
            setShowValidationModal(true);
            return;
        }

        if (!supabase) {
            const errTxt = 'Supabase URL and Key are not configured. Please check your environment variables.';
            setMessage({ type: 'error', text: errTxt });
            showToast(errTxt, 'error');
            return;
        }

        const confirmed = await showConfirm(
            'Confirm Payroll to System?',
            `Payroll data for period ${format(parseISO(settings.periodStart), 'dd/MM/yyyy')} - ${format(parseISO(settings.periodEnd), 'dd/MM/yyyy')} will be permanently saved to the database and this action cannot be undone.`
        );
        if (confirmed) {
            await executePayrollSave();
        }
    };

    const renderTableBody = (filteredResults: PayrollResult[], columns: { label: string, render: (r: PayrollResult) => React.ReactNode, right?: boolean }[]) => (
        <>
        <div className="hidden md:block overflow-x-auto w-full"><table className="w-full text-left mt-8 min-w-[650px]">
            <thead>
                <tr className={`text-[10px] uppercase font-black text-slate-400 border-b-2 border-slate-900 ${isCompactMode ? '' : ''}`}>
                    <th className={`${isCompactMode ? 'py-1 px-2' : 'py-3 px-2'}`}>Name / EMP ID</th>
                    {columns.map((c, i) => <th key={i} className={`${isCompactMode ? 'py-1 px-2' : 'py-3 px-2'} ${c.right ? 'text-right' : ''}`}>{c.label}</th>)}
                </tr>
            </thead>
            <tbody>
                {isLoadingEmployees && results.length === 0 ? (
                    <>
                        {[1, 2, 3].map(i => (
                            <tr key={`sk-${i}`} className="border-b border-slate-100">
                                <td className={`${isCompactMode ? 'py-2 px-2' : 'py-4 px-2'}`}>
                                    <Skeleton className="h-6 w-48 mb-1" />
                                    <Skeleton className="h-4 w-24" />
                                </td>
                                {columns.map((_, colIdx) => (
                                    <td key={colIdx} className={`${isCompactMode ? 'py-2 px-2' : 'py-4 px-2'}`}>
                                        <Skeleton className="h-6 w-24 ml-auto" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </>
                ) : (
                    filteredResults.map(r => (
                        <tr key={r.id} className="border-b border-slate-100">
                            <td className={`${isCompactMode ? 'py-2 px-2' : 'py-4 px-2'}`}>
                                <div className={`font-black text-slate-900 ${isCompactMode ? 'text-base' : 'text-lg'}`}>{r.taxName}</div>
                                <div className={`text-slate-500 font-mono ${isCompactMode ? 'text-[10px]' : 'text-xs'}`}>{r.sin || 'No SIN'}</div>
                            </td>
                            {columns.map((c, i) => <td key={i} className={`${isCompactMode ? 'py-2 px-2 text-sm' : 'py-4 px-2'} ${c.right ? `text-right font-black ${isCompactMode ? 'text-base' : 'text-xl'}` : ''}`}>{c.render(r)}</td>)}
                        </tr>
                    ))
                )}
            </tbody>
        </table></div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 mt-6">
            {isLoadingEmployees && results.length === 0 ? (
                <>
                    {[1, 2, 3].map(i => (
                        <div key={`sk-mobile-${i}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-24 mb-4" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </>
            ) : (
                filteredResults.map(r => (
                    <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
                        <div className="border-b border-slate-100 pb-3">
                            <h4 className="font-black text-slate-900 text-lg leading-tight">{r.taxName}</h4>
                            <p className="text-slate-500 font-mono text-xs mt-1">{r.sin || 'No SIN'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {columns.map((c, i) => (
                                <div key={i} className={`flex flex-col gap-1 bg-slate-50 p-3 rounded-xl border border-slate-100 ${columns.length % 2 !== 0 && i === columns.length - 1 ? 'col-span-2' : ''}`}>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{c.label}</span>
                                    <div className={`font-black ${c.right ? 'text-indigo-700 text-lg' : 'text-slate-800 text-base'}`}>{c.render(r)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
        </>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full xl:w-auto">
                    <h3 className="text-xl font-bold text-slate-800 whitespace-nowrap">Reconciliation & Execution</h3>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <select 
                            className="border-2 border-slate-200 rounded-lg px-4 py-2 font-bold text-indigo-700 outline-none bg-indigo-50 w-full sm:w-auto"
                            value={reportType} onChange={e => setReportType(e.target.value)}
                        >
                            <option value="CHECK">Standard Payroll Report</option>
                            <option value="CASH_TIP">Other Addons (Flexible Payment)</option>
                            <option value="CASH_SALARY">Productivity Bonus Policy</option>
                            <option value="SHORTFALL">Carry-Forward Debt</option>
                        </select>
                        {reportType === 'CHECK' && (
                            <select className="border-2 border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700 outline-none w-full sm:w-auto" value={reportView} onChange={e => setReportView(e.target.value)}>
                                <option value="BOTH">Print Both Weeks</option>
                                <option value="W1">Print only Week 1</option>
                                <option value="W2">Print only Week 2</option>
                            </select>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
                    <button title={isLocked ? "Cycle locked" : "Finalize payroll and save to history"} 
                        onClick={handleSaveClick} 
                        disabled={isSaving || isSaveDisabled || isLocked}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed whitespace-nowrap flex-1 sm:flex-none"
                    >
                        <Save size={18} /> {isSaving ? 'Saving...' : 'Confirm Payroll'}
                    </button>
                    
                    <div className="flex bg-emerald-600 rounded-xl overflow-hidden divide-x divide-emerald-500 shadow-sm flex-1 sm:flex-none">
                            <button 
                                onClick={() => exportPayrollToCSV(results, settings, auditLogs)} 
                                className="text-white px-4 py-2.5 font-bold flex-1 sm:flex-none flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all whitespace-nowrap" 
                                title="Export to CSV (UTF-8) for external systems"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Export CSV
                            </button>
                            <button 
                                onClick={() => exportPayrollToExcel(results, settings, auditLogs)} 
                                className="text-emerald-100 px-4 py-2.5 font-bold flex-1 sm:flex-none flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all whitespace-nowrap text-sm" 
                                title="Export raw data to Excel"
                            >
                                Excel
                            </button>
                        </div>
                    
                    <button onClick={() => window.print()} className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all whitespace-nowrap flex-1 sm:flex-none">
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>

            {message && (
                <div className={cn("p-4 rounded-xl flex items-center justify-between shadow-sm", message.type === 'error' ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200")}>
                    <div className="font-bold">{message.text}</div>
                    <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100 font-bold" title="Dismiss message">&times;</button>
                </div>
            )}

            {showValidationModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center border border-slate-100">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Validation Required</h3>
                        <p className="text-slate-600 mb-8">
                            Please review all working hours (red POS Log table) in <strong>4. Timesheet Processing</strong>. All hours must be checked and Validated before Confirming Payroll.
                        </p>
                        <button onClick={() => setShowValidationModal(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-sm" title="Dismiss message">
                            Understood
                        </button>
                    </div>
                </div>
            )}

            {/* Redundant local confirm modal removed to use unified showConfirm */}

            <div className="grid grid-cols-1 gap-8">
                {reportType === 'CHECK' && (reportView === 'BOTH' || reportView === 'W1') && (
                    <div className="bg-white p-4 md:p-10 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 page-break">
                        <ReportHeader title="STANDARD PAYROLL REPORT - WEEK 1" subtitle="Standard Hours & Addons (Week 1)" settings={settings} color="indigo" week={1} />
                        {renderTableBody(results.filter(r => r.checkHrsWk > 0 || r.standardAddOnsWk > 0), [
                            { label: 'Hours', right: true, render: r => formatNumber(r.checkHrsWk) },
                            { label: 'Amount', right: true, render: r => <span className="text-indigo-600">{formatCurrency(r.standardAddOnsWk)}</span> }
                        ])}
                        <ReportFooter />
                    </div>
                )}
                {reportType === 'CHECK' && (reportView === 'BOTH' || reportView === 'W2') && (
                    <div className="bg-white p-4 md:p-10 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 page-break">
                        <ReportHeader title="STANDARD PAYROLL REPORT - WEEK 2" subtitle="Standard Hours & Addons (Week 2)" settings={settings} color="indigo" week={2} />
                        {renderTableBody(results.filter(r => r.checkHrsWk > 0 || r.standardAddOnsWk > 0), [
                            { label: 'Hours', right: true, render: r => formatNumber(r.checkHrsWk) },
                            { label: 'Amount', right: true, render: r => <span className="text-indigo-600">{formatCurrency(r.standardAddOnsWk)}</span> }
                        ])}
                        <ReportFooter />
                    </div>
                )}
                {reportType === 'CASH_TIP' && (
                    <div className="bg-white p-4 md:p-10 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 page-break">
                        <ReportHeader title="EXPENSE REIMBURSEMENT & ADDONS REPORT" subtitle="Other Addons (2-Week Total)" settings={settings} color="emerald" />
                        {renderTableBody(results.filter(r => r.tipCash2Wk > 0), [
                            { label: 'Total Addons', right: true, render: r => <span className="text-indigo-600">{formatCurrency(r.tipCash2Wk)}</span> }
                        ])}
                        <ReportFooter />
                    </div>
                )}
                {reportType === 'CASH_SALARY' && (
                    <div className="bg-white p-4 md:p-10 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 page-break">
                        <ReportHeader title="PRODUCTIVITY BONUS REPORT" subtitle="Performance & Productivity Fund (2-Week Total)" settings={settings} color="amber" />
                        {renderTableBody(results.filter(r => r.variableBonus > 0), [
                            { label: 'Recorded Volume', right: true, render: r => formatNumber(r.adjustedHrs) },
                            { label: 'Total Bonus', right: true, render: r => <span className="text-amber-600">{formatCurrency(r.variableBonus)}</span> }
                        ])}
                        <ReportFooter />
                    </div>
                )}
                {reportType === 'SHORTFALL' && (
                    <div className="bg-white p-4 md:p-10 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 page-break">
                        {results.some(r => r.carryForwardBalance > 0) && (
                            <div className="bg-rose-50 border-l-4 border-rose-600 p-6 mb-10 rounded-r-lg print-block print-hidden">
                                <h3 className="text-rose-800 font-black mb-1">SYSTEM NOTICE</h3>
                                <p className="text-rose-700">The system will automatically carry forward the balance to the next period to meet the guarantee.</p>
                            </div>
                        )}
                        <ReportHeader title="RECONCILIATION & CARRY-FORWARD" subtitle="Reconciliation & Debt Carry-Forward" settings={settings} color="rose" />
                        {renderTableBody(results.filter(r => r.carryForwardBalance > 0), [
                            { label: 'Actual Earnings This Period', right: true, render: r => formatCurrency(r.actualEarnings2Wk) },
                            { label: 'Standard Guaranteed', right: true, render: r => formatCurrency((r as any).rule?.guaranteedBaseHrs * 2 * r.standardRate) },
                            { label: 'Carry Forward', right: true, render: r => <span className="text-rose-600">{formatCurrency(r.carryForwardBalance)}</span> }
                        ])}
                        <ReportFooter />
                    </div>
                )}
            </div>
        </div>
    );
}

function ReportHeader({ title, subtitle, color = "indigo", settings, week }: { title: string, subtitle: string, color?: string, settings: SystemSettings, week?: number }) {
    const textColor = {
        indigo: "text-indigo-700",
        emerald: "text-emerald-700",
        amber: "text-amber-700",
        rose: "text-rose-700"
    }[color as string] || "text-indigo-700";

    let start = parseISO(settings.periodStart);
    let end = parseISO(settings.periodEnd);
    
    if (week === 1) {
        end = addDays(start, 6);
    } else if (week === 2) {
        start = addDays(start, 7);
    }

    return (
        <div className="text-center">
            <div className="flex justify-center mb-6"><div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-3xl shadow-sm">L</div></div>
            <h1 className="text-2xl font-black uppercase text-slate-900 tracking-widest">{settings.companyName}</h1>
            <h2 className={cn("text-lg font-bold uppercase mt-1", textColor)}>{title}</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">{subtitle}</p>
            <div className="mt-2 text-xs text-slate-400 font-bold uppercase tracking-tighter">
                Period: {format(start, 'dd/MM/yyyy')} - {format(end, 'dd/MM/yyyy')}
            </div>
        </div>
    );
}

function ReportFooter() {
    return (
        <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-end">
            <div className="text-[10px] text-slate-400 font-mono">
                Generated by LIME Enterprise System on {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
            </div>
            <div className="text-right">
                <div className="text-xs font-bold text-slate-400 mb-10 uppercase tracking-widest">Manager Signature</div>
                <div className="w-48 border-t-2 border-slate-900"></div>
            </div>
        </div>
    );
}
