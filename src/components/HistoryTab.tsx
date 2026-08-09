import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, ValidationLog } from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';
import { Search } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

export default function HistoryTab({ employees, settings, isDemoUser }: { employees: Employee[], settings: any, isDemoUser?: boolean }) {
    const { showToast } = useUI();
    const [logs, setLogs] = useState<ValidationLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            if (!settings.companyId) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('pos_validations')
                    .select('*, profiles:validated_by (email)')
                    .eq('company_id', settings.companyId)
                    .order('validated_at', { ascending: false });

                if (error) throw error;
                
                // Fallback for Demo Environment
                if (!data || data.length === 0) {
                    if (isDemoUser) {
                        const mockLogs = [
                            {
                                id: 'mock-1',
                                company_id: settings.companyId,
                                emp_id: 2, // JP
                                log_date: '2026-07-11',
                                validated_by: 'demo_owner@limepayroll.local',
                                validated_at: new Date().toISOString(),
                                original_value: 12.00,
                                modified_value: 8.00,
                                action_type: 'Validation',
                                profiles: { email: 'demo_owner@limepayroll.local' }
                            },
                            {
                                id: 'mock-2',
                                company_id: settings.companyId,
                                emp_id: 3, // Sophie
                                log_date: '2026-07-12',
                                validated_by: 'demo_owner@limepayroll.local',
                                validated_at: new Date(Date.now() - 3600000).toISOString(),
                                original_value: 10.50,
                                modified_value: 6.00,
                                action_type: 'Validation',
                                profiles: { email: 'demo_owner@limepayroll.local' }
                            },
                            {
                                id: 'mock-3',
                                company_id: settings.companyId,
                                emp_id: 4, // Luc
                                log_date: '2026-07-13',
                                validated_by: 'demo_owner@limepayroll.local',
                                validated_at: new Date(Date.now() - 7200000).toISOString(),
                                original_value: 14.00,
                                modified_value: 8.00,
                                action_type: 'Validation',
                                profiles: { email: 'demo_owner@limepayroll.local' }
                            }
                        ];
                        const localLogs = JSON.parse(sessionStorage.getItem('demo_audit_logs') || '[]');
                        setLogs([...localLogs, ...mockLogs]);
                    } else {
                        setLogs([]);
                    }
                } else {
                    setLogs(data);
                }
            } catch (error: any) {
                console.error('Error fetching audit logs:', error);
                // Silent fallback for demo instead of error toast
                setLogs([]); 
            } finally {
                setIsLoading(false);
            }
        };

        fetchAuditLogs();
    }, [settings.companyId]);

    const getEmployeeName = (empId: number) => {
        if (!empId) return 'System Level';
        const emp = employees.find(e => e.id === empId);
        return emp ? emp.nickname : `Unknown ID: ${empId}`;
    };

    return (
        <div className="space-y-6" data-tour="step-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-2">System Audit Ledger</h3>
                <p className="text-sm text-slate-500">A comprehensive, immutable log of all manual overrides and validations made to POS session data.</p>
            </div>

            {isLoading ? (
                <div className="p-8 text-center text-slate-500 font-bold">
                    <Search className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />
                    Loading audit trail...
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4">Employee / Target</th>
                                    <th className="px-6 py-4">Action</th>
                                    <th className="px-6 py-4">Action Date</th>
                                    <th className="px-6 py-4 text-right">Original</th>
                                    <th className="px-6 py-4 text-right">Modified</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => {
                                    const isLock = log.session_id === 'SYSTEM_LOCK' || log.action_type === 'Payroll cycle locked / confirmed';
                                    return (
                                    <tr key={log.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isLock ? 'bg-amber-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{getEmployeeName(log.emp_id)}</div>
                                            {log.emp_id && <div className="text-xs text-slate-500">ID: {log.emp_id}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${isLock ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                                {log.action_type || 'Validation'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{log.log_date}</td>
                                        <td className="px-6 py-4 text-right font-mono text-sm text-slate-500">{log.original_value !== undefined && log.original_value !== null ? `${log.original_value.toFixed(2)}h` : '-'}</td>
                                        <td className="px-6 py-4 text-right font-black text-indigo-600">{log.modified_value !== undefined && log.modified_value !== null ? `${log.modified_value.toFixed(2)}h` : '-'}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{log.profiles?.email || log.validated_by}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(log.validated_at).toLocaleString()}</td>
                                    </tr>
                                    );
                                })}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-bold">
                                            No audit logs found for this company.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
