import React, { useState, useEffect } from 'react';
import { AlertTriangle, Printer, History } from 'lucide-react';
import { hasSessionAnomaly, handlePrint } from '../lib/utils';
import { Anomaly, Employee, Timesheet, ValidationLog, SystemSettings, POSLog } from '../types';
import { supabase } from '../lib/supabase';

interface PosLogEditRowProps {
    log: POSLog;
    logIdx: number;
    empId: number;
    onConfirm: (empId: number, logIdx: number, newSessions: string[]) => void;
    onValidate: (empId: number, logIdx: number) => Promise<void> | void;
    auditLog?: ValidationLog;
}

const PosLogEditRow = ({ log, logIdx, empId, onConfirm, onValidate, auditLog }: PosLogEditRowProps) => {
    const [editMode, setEditMode] = useState(false);
    const [sessionsStr, setSessionsStr] = useState(log.sessions.join(', '));
    const [confirmValidate, setConfirmValidate] = useState(false);
    
    useEffect(() => {
        setSessionsStr(log.sessions.join(', '));
    }, [log]);

    const handleConfirm = () => {
        const newSessions = sessionsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        onConfirm(empId, logIdx, newSessions);
        setEditMode(false);
    };

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td className="p-4 whitespace-nowrap w-28">
                {log.isWeek1 ? <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 whitespace-nowrap">Week 1</span> : <span className="bg-indigo-50 text-indigo-700 px-3 py-1 text-xs rounded-full font-bold border border-indigo-200 whitespace-nowrap">Week 2</span>}
            </td>
            <td className="p-4 font-bold text-slate-700">{log.date}</td>
            <td className="p-4">
                {editMode ? (
                    <input 
                        type="text" 
                        value={sessionsStr} 
                        onChange={e => setSessionsStr(e.target.value)} 
                        className="w-full p-2 border border-indigo-300 rounded outline-none focus:border-indigo-500 font-mono text-sm"
                        placeholder="e.g. 11:00-14:00, 17:00-22:00"
                    />
                ) : (
                    <div className="flex gap-2 flex-wrap">
                        {log.sessions.map((s: string, i: number) => (
                            <span key={i} className="bg-white px-2 py-1 rounded text-xs border border-slate-200 shadow-sm font-mono">{s}</span>
                        ))}
                    </div>
                )}
            </td>
            <td className="p-4 text-right">
                <span className={`font-black text-lg ${hasSessionAnomaly(log.sessions, log.isValidated) ? "text-rose-600" : "text-emerald-600"}`}>
                    {log.hrs.toFixed(2)}h
                </span>
            </td>
            <td className="p-4 text-right w-48">
                {editMode ? (
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditMode(false); setSessionsStr(log.sessions.join(', ')); }} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded font-bold text-xs border border-transparent">Cancel</button>
                        <button onClick={handleConfirm} className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded font-bold text-xs shadow-sm">Confirm</button>
                    </div>
                ) : (
                    <div className="flex gap-2 justify-end items-center">
                        {hasSessionAnomaly(log.sessions) ? (
                            !log.isValidated ? (
                                confirmValidate ? (
                                    <div className="flex gap-1 items-center bg-emerald-50 rounded p-1 border border-emerald-200">
                                        <span className="text-[10px] text-emerald-800 font-bold px-1 whitespace-nowrap">Sure?</span>
                                        <button onClick={async () => { await onValidate(empId, logIdx); setConfirmValidate(false); }} className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded font-bold text-xs shadow-sm">Yes</button>
                                        <button onClick={() => setConfirmValidate(false)} className="px-2 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded font-bold text-xs shadow-sm">No</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setConfirmValidate(true)} className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 rounded font-bold text-xs shadow-sm" title="Mark this anomaly as validated and correct">Validated</button>
                                )
                            ) : (
                                auditLog ? (
                                    <div className="relative group flex items-center">
                                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-1 rounded font-bold cursor-help">✓ System Verified</span>
                                        <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs p-2 bg-slate-900 text-white text-[10px] font-mono rounded shadow-xl hidden group-hover:block z-50">
                                            ✅ Verified by: {auditLog.profiles?.email || auditLog.validated_by} at {new Date(auditLog.validated_at).toLocaleString()}
                                            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative group flex items-center">
                                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-1 rounded font-bold cursor-help">✓ System Verified</span>
                                        <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs p-2 bg-slate-900 text-white text-[10px] font-mono rounded shadow-xl hidden group-hover:block z-50">
                                            Verified by: Current Session (Demo) at {new Date().toLocaleString()}
                                            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                                        </div>
                                    </div>
                                )
                            )
                        ) : null}
                        <button onClick={() => setEditMode(true)} className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded font-bold text-xs shadow-sm">Edit</button>
                    </div>
                )}
            </td>
        </tr>
    );
};

interface PosModalsProps {
    settings: SystemSettings;
    anomalies: Anomaly[];
    showAnomaliesModal: boolean;
    setShowAnomaliesModal: (show: boolean) => void;
    setAnomalies: (anomalies: Anomaly[]) => void;
    viewLogsConfig: { empId: number | null, filter: 'all'|'valid'|'anomaly' | '' } | null;
    setViewLogsConfig: (config: { empId: number | null, filter: 'all'|'valid'|'anomaly' | '' } | null) => void;
    employees: Employee[];
    timesheets: Record<number, Timesheet>;
    handlePosLogEdit: (empId: number, logIdx: number, newSessions: string[]) => void;
    handlePosLogValidate: (empId: number, logIdx: number) => Promise<void> | void;
}

export default function PosModals({
    settings,
    anomalies,
    showAnomaliesModal,
    setShowAnomaliesModal,
    setAnomalies,
    viewLogsConfig,
    setViewLogsConfig,
    employees,
    timesheets,
    handlePosLogEdit,
    handlePosLogValidate
}: PosModalsProps) {
    const [auditLogs, setAuditLogs] = useState<Record<string, ValidationLog>>({});

    useEffect(() => {
        const fetchAuditLogs = async () => {
            if (!settings.companyId) return;
            const { data, error } = await supabase
                .from('pos_validations')
                .select('*, profiles:validated_by (email)')
                .eq('company_id', settings.companyId);
            
            if (error) {
                console.error('Error fetching audit logs:', error);
                return;
            }
            
            const logMap: Record<string, ValidationLog> = {};
            data.forEach(log => {
                logMap[`${log.emp_id}_${log.log_date}`] = log;
            });
            setAuditLogs(logMap);
        };
        fetchAuditLogs();
    }, [settings.companyId]);

    return (
        <>
            {/* Anomalies Modal */}
            {showAnomaliesModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-6 print:static print:bg-white print:block">
                    <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] print:shadow-none print:max-h-none">
                        <div className="bg-amber-600 p-6 text-white flex justify-between print-hidden">
                            <h3 className="text-xl font-bold flex items-center gap-3"><AlertTriangle /> Data Anomaly Report</h3>
                            <button onClick={() => setShowAnomaliesModal(false)} className="text-white hover:text-amber-200">X</button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 print:overflow-visible">
                            <div className="text-center mb-8 hidden print-block">
                                <h1 className="text-2xl font-black uppercase text-slate-900">{settings.companyId ? settings.companyName : "Select a company"}</h1>
                                <p className="text-amber-600 text-lg font-bold">POS ANOMALY REPORT</p>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800 text-white print:bg-slate-100 print:text-slate-800">
                                    <tr>
                                        <th className="p-4 border-b">Date</th>
                                        <th className="p-4 border-b">POS ID</th>
                                        <th className="p-4 border-b">Session</th>
                                        <th className="p-4 text-right border-b">Duration</th>
                                        <th className="p-4 text-center border-b print:table-cell hidden">Manager Approval</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {anomalies.map((ano, idx) => (
                                        <tr key={idx} className="border-b border-slate-200">
                                            <td className="p-4 font-bold">{ano.date}</td>
                                            <td className="p-4 font-bold">{ano.name}</td>
                                            <td className="p-4"><span className="bg-slate-100 px-3 py-1 rounded-lg border">{ano.session}</span></td>
                                            <td className="p-4 text-right font-black text-rose-600">{ano.hrs.toFixed(2)}h</td>
                                            <td className="p-4 print:table-cell hidden"><div className="border-b-2 border-dashed border-slate-300 w-full mt-4"></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-5 bg-white border-t flex justify-between print-hidden rounded-b-2xl">
                            <button onClick={() => { setAnomalies([]) }} className="text-slate-500 font-bold hover:text-rose-600">Dismiss anomalies</button>
                            <button onClick={handlePrint} className="px-6 py-2 bg-amber-500 text-white font-bold rounded-xl flex items-center gap-2"><Printer size={18} /> Print Report</button>
                        </div>
                    </div>
                </div>
            )}

            {/* POS Logs Modal */}
            {viewLogsConfig && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-6 print:static print:bg-white print:block">
                    <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] print:shadow-none print:max-h-none">
                        <div className="bg-emerald-700 p-6 text-white flex justify-between rounded-t-2xl">
                            <h3 className="text-xl font-bold flex items-center gap-3"><History /> POS Worklog: {employees.find(e => e.id === viewLogsConfig.empId)?.nickname}</h3>
                            <button onClick={() => setViewLogsConfig(null)} className="text-white hover:text-emerald-200">X</button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 print:overflow-visible">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="p-4 font-bold border-b-2 uppercase text-xs text-slate-500 whitespace-nowrap w-28">Period</th>
                                        <th className="p-4 font-bold border-b-2 uppercase text-xs text-slate-500 whitespace-nowrap w-32">Record Date</th>
                                        <th className="p-4 font-bold border-b-2 uppercase text-xs text-slate-500 w-full min-w-[250px]">Session</th>
                                        <th className="p-4 text-right font-bold border-b-2 uppercase text-xs text-slate-500 whitespace-nowrap w-24">Hours</th>
                                        <th className="p-4 text-right font-bold border-b-2 uppercase text-xs text-slate-500 whitespace-nowrap w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(timesheets[viewLogsConfig.empId]?.posLogs || [])
                                        .map((log: any, idx: number) => ({ log, idx }))
                                        .filter(({ log }: any) => {
                                            if (viewLogsConfig.filter === 'valid') return !hasSessionAnomaly(log.sessions, log.isValidated);
                                            if (viewLogsConfig.filter === 'anomaly') return hasSessionAnomaly(log.sessions, log.isValidated);
                                            return true;
                                        })
                                        .map(({ log, idx }: any) => (
                                        <PosLogEditRow key={idx} log={log} logIdx={idx} empId={viewLogsConfig.empId} onConfirm={handlePosLogEdit} onValidate={handlePosLogValidate} auditLog={auditLogs[`${viewLogsConfig.empId}_${log.date}`]} />
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-800 text-white sticky bottom-0">
                                    <tr>
                                        <td colSpan={4} className="p-5 text-right font-bold uppercase text-sm">Total Auto Hours:</td>
                                        <td className="p-5 text-right font-black text-emerald-400 text-2xl">{(timesheets[viewLogsConfig.empId]?.posTotalHrs || 0).toFixed(2)}h</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
