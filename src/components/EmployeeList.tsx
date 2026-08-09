import React, { useState, useEffect } from 'react';
import { Plus, Edit, AlertTriangle, Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { Employee, Rule, SystemSettings, CustomRule } from '../types';
import { supabase } from '../lib/supabase';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from './ui/Skeleton';



const RULE_TYPES = [
    { id: 'STANDARD_MAX', title: 'Standard Max', desc: 'Has a maximum hours cap per week.' },
    { id: 'GUARANTEED_MIN_HOURS', title: 'Guaranteed Min Hours', desc: 'Minimum hours guaranteed regardless of actual input.' },
    { id: 'CHECK_PLUS_CASH', title: 'Hours Plus Addons', desc: 'Fixed hours with additional addons.' },
    { id: 'COST_ALLOCATION_OUT_FLAT', title: 'Transfer Out Flat', desc: 'Transfer a fixed amount of hours to another partner.' },
    { id: 'COST_ALLOCATION_IN_FLAT', title: 'Transfer In Flat', desc: 'Receive a fixed amount of hours from another partner.' },
    { id: 'COST_ALLOCATION_OUT_PERCENT', title: 'Transfer Out Percent', desc: 'Transfer excess hours proportionally.' },
    { id: 'COST_ALLOCATION_IN_PERCENT', title: 'Transfer In Percent', desc: 'Convert proportional hours from an adjacent project.' },
    { id: 'NON_PAYROLL_CONTRACTOR', title: 'Non-Payroll Contractor', desc: 'Direct payment based on progress, bypassing standard payroll.' },
    { id: 'FIXED_TOTAL', title: 'Fixed Total', desc: 'Fixed hours and addons entirely fixed per period.' }
];

export interface EmployeeFormData {
    id?: number;
    nickname: string;
    taxName: string;
    customRate: number | string;
    standardRate: number | string;
    sin: string;
    address?: string;
    rule: Rule;
    updated_at?: string;
    company_id?: string;
}

interface EmployeeListProps {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    settings: SystemSettings;
    isLoadingEmployees: boolean;
    isLocked?: boolean;
}

export default function EmployeeList({ employees, setEmployees, settings, isLoadingEmployees, isLocked }: EmployeeListProps) {
    const { showToast, showConfirm } = useUI();
    const { role } = useAuth();
    const isReadOnly = isLocked || role === 'STAFF' || role === 'FINANCE';
    const canEdit = !isReadOnly;
    const defaultRule: Rule = { type: 'STANDARD_MAX', maxHrs: 40 };
    const [modalState, setModalState] = useState({ isOpen: false, isEditing: false, empId: null as number | null });
    const [formData, setFormData] = useState<EmployeeFormData>({ nickname: '', taxName: '', customRate: '', standardRate: '', sin: '', rule: defaultRule });

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const [customRules, setCustomRules] = useState<CustomRule[]>([]);

    useEffect(() => {
        if (settings.companyId) {
            fetchCustomRules();
        } else {
            setCustomRules([]);
        }
    }, [settings.companyId]);

    const fetchCustomRules = async () => {
        if (!settings.companyId) return;
        try {
            const { data, error } = await supabase
                .from('custom_rules')
                .select('*')
                .eq('company_id', settings.companyId)
                .order('name', { ascending: true });
            
            if (error) throw error;
            setCustomRules(data || []);
        } catch (error) {
            console.error('Error fetching custom rules:', error);
            showToast('Failed to load custom rules.', 'error');
        }
    };

    const filteredEmployees = React.useMemo(() => {
        return employees.filter((emp: Employee) => {
            const nick = (emp.nickname || '').toLowerCase();
            const tax = (emp.taxName || '').toLowerCase();
            const q = searchTerm.toLowerCase().trim();
            return nick.includes(q) || tax.includes(q);
        });
    }, [employees, searchTerm]);

    const paginatedEmployees = React.useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredEmployees, currentPage]);

    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);

    
    const importDefaults = async () => {
        const confirmed = await showConfirm(
            'Import Defaults',
            'This will append the new employee list to your current staff. Continue?'
        );
        if (!confirmed) return;
        
        const DEFAULT_EMPLOYEES = [
            { id: 1, nickname: 'Mia', taxName: 'Trần Hoàng My', customRate: 30, standardRate: 30, sin: '', address: '', rule: { type: 'FIXED_TOTAL', fixedHrs: 40, fixedTip: 600 } },
            { id: 2, nickname: 'JP', taxName: 'Jean-Paul Tremblay', customRate: 25, standardRate: 25, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 44 } },
            { id: 3, nickname: 'Sophie', taxName: 'Sophie Đinh', customRate: 21, standardRate: 21, sin: '', address: '', rule: { type: 'GUARANTEED_MIN_HOURS', guaranteedBaseHrs: 35 } },
            { id: 4, nickname: 'Luc', taxName: 'Lucas Fortin', customRate: 20, standardRate: 20, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
            { id: 5, nickname: 'Minh', taxName: 'Lê Minh', customRate: 16, standardRate: 16, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 44 } },
            { id: 6, nickname: 'Chloe', taxName: 'Chloe Dubois', customRate: 16, standardRate: 16, sin: '', address: '', rule: { type: 'CHECK_PLUS_CASH', fixedCheckHrs: 10, fixedCheckTip: 30 } },
            { id: 7, nickname: 'Kevin', taxName: 'Đặng Tuấn Kiệt', customRate: 18, standardRate: 18, sin: '', address: '', rule: { type: 'COST_ALLOCATION_OUT_PERCENT', hrsPercent: 50, tipPercent: 50, linkedId: 8 } },
            { id: 8, nickname: 'Hải', taxName: 'Nguyễn Vũ Hải', customRate: 15, standardRate: 15, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_PERCENT', parentId: 7 } },
            { id: 9, nickname: 'Emma', taxName: 'Emma Roy', customRate: 15, standardRate: 15, sin: '', address: '', rule: { type: 'COST_ALLOCATION_OUT_FLAT', hrsToGive: 10, linkedId: 10 } },
            { id: 10, nickname: 'Liam', taxName: 'Liam Nguyễn', customRate: 16, standardRate: 16, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_FLAT', parentId: 9 } },
            { id: 11, nickname: 'Bella', taxName: 'Isabella Gagnon', customRate: 25, standardRate: 25, sin: '', address: '', rule: { type: 'NON_PAYROLL_CONTRACTOR' } },
            { id: 12, nickname: 'Dave', taxName: 'David Côté', customRate: 22, standardRate: 22, sin: '', address: '', rule: { type: 'NON_PAYROLL_CONTRACTOR' } }
        ];

        try {
            if (supabase) {
                if (!settings.companyId) { showToast("Please select a company in System Configuration first.", "error"); return; }
                await supabase.from('employees').delete().eq('company_id', settings.companyId);
                const mappedDefaults = DEFAULT_EMPLOYEES.map(e => ({
                    nickname: e.nickname,
                    tax_name: e.taxName,
                    custom_rate: e.customRate,
                    standard_rate: e.standardRate,
                    sin: e.sin || '',
                    address: e.address || '',
                    rule: e.rule,
                    company_id: settings.companyId
                }));
                const { data } = await supabase.from('employees').insert(mappedDefaults).select();
                if (data) {
                    const mappedBack = data.map((emp) => ({
                        ...emp,
                        taxName: emp.tax_name !== undefined ? emp.tax_name : emp.taxName,
                        customRate: emp.custom_rate !== undefined ? emp.custom_rate : emp.customRate,
                        standardRate: emp.standard_rate !== undefined ? emp.standard_rate : emp.standardRate,
                    }));
                    setEmployees(mappedBack);
                }
            } else {
                setEmployees(DEFAULT_EMPLOYEES as any);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const openModal = (emp: Employee | null = null) => {
        if (emp) {
            setFormData({ ...emp, customRate: emp.customRate, standardRate: emp.standardRate }); setModalState({ isOpen: true, isEditing: true, empId: emp.id });
        } else {
            setFormData({ nickname: '', taxName: '', customRate: '', standardRate: '', sin: '', rule: defaultRule });
            setModalState({ isOpen: true, isEditing: false, empId: null });
        }
    };

    const saveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        const processedData = { ...formData, customRate: parseFloat(formData.customRate as string) || 0, standardRate: parseFloat(formData.standardRate as string) || 0 };
        
        if (!supabase) { /* bypass */ }

        try {
            const dbPayload = {
                nickname: processedData.nickname,
                tax_name: processedData.taxName,
                custom_rate: processedData.customRate,
                standard_rate: processedData.standardRate,
                sin: processedData.sin || '',
                address: processedData.address || '',
                rule: processedData.rule,
                company_id: processedData.company_id || settings.companyId
            };

            const mapFromDb = (emp: any) => ({
                ...emp,
                taxName: emp.tax_name !== undefined ? emp.tax_name : emp.taxName,
                customRate: emp.custom_rate !== undefined ? emp.custom_rate : emp.customRate,
                standardRate: emp.standard_rate !== undefined ? emp.standard_rate : emp.standardRate,
            });

            if (modalState.isEditing) {
                let updatedEmp = { ...processedData, id: modalState.empId };
                try {
                    if (supabase) {
                        // Optimistic Locking Check
                        const { data: currentData, error: checkError } = await supabase
                            .from('employees')
                            .select('updated_at')
                            .eq('id', modalState.empId)
                            .single();
                            
                        if (!checkError && currentData) {
                            if (formData.updated_at && currentData.updated_at !== formData.updated_at) {
                                showToast('Data stale: Modified by another user.', 'error');
                                return;
                            }
                        }

                        const { data, error } = await supabase.from('employees').update(dbPayload).eq('id', modalState.empId).select();
                        if (!error && data?.[0]) updatedEmp = mapFromDb(data[0]);
                    }
                } catch (e) { console.warn("Supabase update failed, using local state"); }
                setEmployees(employees.map((emp: Employee) => emp.id === modalState.empId ? updatedEmp as Employee : emp));
            } else {
                let newEmp = { ...processedData, id: Date.now() };
                try {
                    if (supabase) {
                        if (!settings.companyId) { showToast("Please select a company first", "error"); return; }
                        const { data, error } = await supabase.from('employees').insert([dbPayload]).select();
                        if (!error && data?.[0]) newEmp = mapFromDb(data[0]);
                    }
                } catch (e) { console.warn("Supabase insert failed, using local state"); }
                setEmployees([...employees, newEmp as Employee]);
            }
            setModalState({ isOpen: false, isEditing: false, empId: null });
        } catch (error) {
            console.warn('Unhandled error:', error);
        }

    };

    
    const deleteEmployee = async () => {
        try {
            if (supabase) {
                await supabase.from('employees').delete().eq('id', modalState.empId).then(({error}) => { if (error) console.error(error); });
            }
        } catch (e) {}
        setEmployees(employees.filter((e: Employee) => e.id !== modalState.empId));
        setModalState({ isOpen: false, isEditing: false, empId: null });
        showToast('Employee deleted successfully.', 'success');
    };

    const handleDeleteClick = async () => {
        const confirmed = await showConfirm(
            'Delete Employee?',
            'Are you sure you want to delete this employee? This action cannot be undone.'
        );
        if (confirmed) {
            await deleteEmployee();
        }
    };


    return (
        <div className="space-y-6" data-onboard="tour-employees">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Payroll Rule Configuration</h2>
                    <p className="text-slate-500">Configure specific payroll rules for each employee. Set up once.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search nickname or legal name..." 
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm transition-all bg-white shadow-sm"
                        />
                    </div>
                    {canEdit && (
                        <button onClick={() => openModal()} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap" title="Add a new employee to the system">
                            <Plus size={18} /> Add Employee
                        </button>
                    )}
                </div>
            </div>

            {isLoadingEmployees && employees.length === 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div className="w-full">
                                <div className="flex items-center gap-3 mb-2">
                                    <Skeleton className="h-6 w-1/3" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <Skeleton className="h-4 w-1/2 mb-3" />
                                <div className="flex space-x-4">
                                    <Skeleton className="h-6 w-24" />
                                    <Skeleton className="h-6 w-24" />
                                </div>
                            </div>
                            <Skeleton className="w-10 h-10 rounded-full shrink-0 ml-4" />
                        </div>
                    ))}
                </div>
            ) : paginatedEmployees.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <Search size={40} className="text-slate-300 mb-3" />
                    <p className="text-slate-500 font-bold text-lg">No Employees Found</p>
                    <p className="text-slate-400 text-sm mt-1">We couldn't find anyone matching "{searchTerm}". Try another search term.</p>
                    {searchTerm && (
                        <button 
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="mt-4 text-xs bg-slate-100 hover:bg-slate-200 text-indigo-600 font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Reset Search
                        </button>
                    )}
                </div>
            ) : (
                <>
                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto hide-scrollbar">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Rule Type</th>
                                    <th className="px-4 py-3">Rates</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedEmployees.map((emp: Employee) => {
                                    let ruleDetail = '';
                                    if (emp.rule.type === 'STANDARD_MAX') ruleDetail = `Max ${emp.rule.maxHrs || 0}h/w`;
                                    else if (emp.rule.type === 'GUARANTEED_MIN_HOURS') ruleDetail = `Min ${emp.rule.guaranteedBaseHrs || 0}h/w`;
                                    else if (emp.rule.type === 'FIXED_TOTAL') ruleDetail = `${emp.rule.fixedHrs || 0}h & $${emp.rule.fixedTip || 0}`;
                                    else if (emp.rule.type === 'CHECK_PLUS_CASH') ruleDetail = `${emp.rule.fixedCheckHrs || 0}h & $${emp.rule.fixedCheckTip || 0}`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_OUT_FLAT') ruleDetail = `Transfer ${emp.rule.hrsToGive || 0}h`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_IN_FLAT') {
                                        const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                                        ruleDetail = parent ? `From ${parent.nickname}` : 'From partner';
                                    }
                                    else if (emp.rule.type === 'COST_ALLOCATION_OUT_PERCENT') ruleDetail = `Keep ${emp.rule.maxOwnHrs || 0}h`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_IN_PERCENT') {
                                        const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                                        ruleDetail = parent ? `${emp.rule.hrsPercent || 0}% from ${parent.nickname}` : `${emp.rule.hrsPercent || 0}%`;
                                    }
                                    else if (emp.rule.type === 'NON_PAYROLL_CONTRACTOR') ruleDetail = `Direct Pay`;
                                    else if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') {
                                        const cr = customRules.find(r => r.id === emp.rule.customRuleId);
                                        ruleDetail = cr ? `Lib: ${cr.name}` : 'Library Rule';
                                    }

                                    let ruleTypeTitle = RULE_TYPES.find(r => r.id === emp.rule.type)?.title;
                                    if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') ruleTypeTitle = 'Custom Rule';

                                    return (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => openModal(emp)}>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                        {emp.nickname.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{emp.nickname}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">{emp.taxName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border border-indigo-100">
                                                        {ruleTypeTitle || emp.rule.type.replace(/_/g, ' ')}
                                                    </span>
                                                    {ruleDetail && <span className="text-[10px] text-slate-500 font-medium">{ruleDetail}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                        C: <strong className="font-bold">${emp.customRate}</strong>
                                                    </span>
                                                    <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                        S: <strong className="font-bold">${emp.standardRate}</strong>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-400 group-hover:bg-slate-200 group-hover:text-indigo-600 transition-colors">
                                                    {!canEdit ? <Eye size={16} /> : <Edit size={16} />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="block md:hidden flex flex-col gap-3">
                    {paginatedEmployees.map((emp: Employee) => {
                        let ruleDetail = '';
                        if (emp.rule.type === 'STANDARD_MAX') ruleDetail = `Max ${emp.rule.maxHrs || 0}h/w`;
                        else if (emp.rule.type === 'GUARANTEED_MIN_HOURS') ruleDetail = `Min ${emp.rule.guaranteedBaseHrs || 0}h/w`;
                        else if (emp.rule.type === 'FIXED_TOTAL') ruleDetail = `${emp.rule.fixedHrs || 0}h & $${emp.rule.fixedTip || 0}`;
                        else if (emp.rule.type === 'CHECK_PLUS_CASH') ruleDetail = `${emp.rule.fixedCheckHrs || 0}h & $${emp.rule.fixedCheckTip || 0}`;
                        else if (emp.rule.type === 'COST_ALLOCATION_OUT_FLAT') ruleDetail = `Transfer ${emp.rule.hrsToGive || 0}h`;
                        else if (emp.rule.type === 'COST_ALLOCATION_IN_FLAT') {
                            const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                            ruleDetail = parent ? `From ${parent.nickname}` : 'From partner';
                        }
                        else if (emp.rule.type === 'COST_ALLOCATION_OUT_PERCENT') ruleDetail = `Keep ${emp.rule.maxOwnHrs || 0}h`;
                        else if (emp.rule.type === 'COST_ALLOCATION_IN_PERCENT') {
                            const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                            ruleDetail = parent ? `${emp.rule.hrsPercent || 0}% from ${parent.nickname}` : `${emp.rule.hrsPercent || 0}%`;
                        }
                        else if (emp.rule.type === 'NON_PAYROLL_CONTRACTOR') ruleDetail = `Direct Pay`;
                        else if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') {
                            const cr = customRules.find(r => r.id === emp.rule.customRuleId);
                            ruleDetail = cr ? `Lib: ${cr.name}` : 'Library Rule';
                        }

                        let ruleTypeTitle = RULE_TYPES.find(r => r.id === emp.rule.type)?.title;
                        if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') ruleTypeTitle = 'Custom Rule';

                        return (
                            <div key={emp.id} onClick={() => openModal(emp)} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                            {emp.nickname.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-base">{emp.nickname}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{emp.taxName}</div>
                                        </div>
                                    </div>
                                    <div className="text-slate-400">
                                        {!canEdit ? <Eye size={18} /> : <Edit size={18} />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rule Type</span>
                                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border border-indigo-100">
                                            {ruleTypeTitle || emp.rule.type.replace(/_/g, ' ')}
                                        </span>
                                        {ruleDetail && <span className="text-[10px] text-slate-500 font-medium">{ruleDetail}</span>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rates</span>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px] font-mono w-fit">
                                                C: <strong className="font-bold">${emp.customRate}</strong>
                                            </span>
                                            <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono w-fit">
                                                S: <strong className="font-bold">${emp.standardRate}</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                </>
            )}

            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm mt-4">
                    <div className="text-sm text-slate-500 font-medium">
                        Showing <strong className="font-bold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong className="font-bold text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)}</strong> of <strong className="font-bold text-slate-800">{filteredEmployees.length}</strong> employees
                    </div>
                    <div className="flex gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                            title="Previous Page"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                            title="Next Page"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {modalState.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="text-xl font-bold">{modalState.isEditing ? 'Edit Employee' : 'Add Employee'}</h3>
                            <button onClick={() => setModalState({ isOpen: false, isEditing: false, empId: null })} className="text-slate-500 hover:text-slate-800" title="Close modal"><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <form id="empForm" onSubmit={saveEmployee} className="grid grid-cols-2 gap-3 text-sm">
                                <div className="col-span-2 sm:col-span-1"><label className="block font-bold text-slate-600 mb-1">Nickname <span className="text-rose-500">*</span></label><input disabled={isReadOnly} required className="w-full border-2 p-1.5 rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500 focus:border-indigo-500" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} /></div>
                                <div className="col-span-2 sm:col-span-1"><label className="block font-bold text-slate-600 mb-1">Legal Name <span className="text-rose-500">*</span></label><input disabled={isReadOnly} required className="w-full border-2 p-1.5 rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500 focus:border-indigo-500" value={formData.taxName} onChange={e => setFormData({...formData, taxName: e.target.value.toUpperCase()})} /></div>
                                <div className="col-span-2 sm:col-span-1"><label className="block font-bold text-slate-600 mb-1">SIN (Optional)</label><input disabled={isReadOnly} className="w-full border-2 p-1.5 rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500 focus:border-indigo-500" value={formData.sin} onChange={e => setFormData({...formData, sin: e.target.value})} /></div>
                                <div className="col-span-2 sm:col-span-1 flex gap-2">
                                    <div className="flex-1"><label className="block font-bold text-slate-600 mb-1">Custom Rate ($)</label><input disabled={isReadOnly} type="number" step="0.01" className="w-full border-2 p-1.5 rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500 focus:border-indigo-500" value={formData.customRate} onChange={e => setFormData({...formData, customRate: e.target.value})} /></div>
                                    <div className="flex-1"><label className="block font-bold text-slate-600 mb-1">Std Rate ($) <span className="text-rose-500">*</span></label><input disabled={isReadOnly} required type="number" step="0.01" className="w-full border-2 p-1.5 rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500 focus:border-indigo-500" value={formData.standardRate} onChange={e => setFormData({...formData, standardRate: e.target.value})} /></div>
                                </div>
                                <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 mt-1">
                                    <label className="block font-bold text-indigo-600 mb-3">Rule Type <span className="text-rose-500">*</span></label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-[220px] overflow-y-auto p-1">
                                        {RULE_TYPES.map(r => (
                                            <label key={r.id} className={`p-2 rounded-lg border-2 transition-all flex flex-col gap-0.5 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'} ${formData.rule.type === r.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                                                <div className="flex items-center gap-2">
                                                    <input required type="radio" name="ruleType" 
                                                        disabled={isReadOnly}
                                                        className={`accent-indigo-600 w-3.5 h-3.5 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                                        checked={formData.rule.type === r.id}
                                                        onChange={() => setFormData({
                                                            ...formData,
                                                            rule: {
                                                                type: r.id as any,
                                                                maxHrs: 40,
                                                                guaranteedBaseHrs: 40,
                                                                fixedHrs: 40,
                                                                fixedTip: 600,
                                                                fixedCheckHrs: 10,
                                                                fixedCheckTip: 30,
                                                                linkedId: '',
                                                                hrsToGive: 20,
                                                                maxOwnHrs: 25,
                                                                parentId: '',
                                                                hrsPercent: 60,
                                                                tipPercent: 40
                                                            }
                                                        })}
                                                    />
                                                    <span className={`font-bold text-xs ${formData.rule.type === r.id ? 'text-indigo-900' : 'text-slate-800'}`}>{r.title}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 pl-5 leading-tight">{r.desc}</p>
                                            </label>
                                        ))}

                                        {/* Render Custom Rules from Library */}
                                        {customRules.map(cr => (
                                            <label key={cr.id} className={`p-2 rounded-lg border-2 transition-all flex flex-col gap-0.5 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'} ${formData.rule.customRuleId === cr.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                                                <div className="flex items-center gap-2">
                                                    <input required type="radio" name="ruleType" 
                                                        disabled={isReadOnly}
                                                        className={`accent-indigo-600 w-3.5 h-3.5 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                                        checked={formData.rule.customRuleId === cr.id}
                                                        onChange={() => setFormData({
                                                            ...formData,
                                                            rule: {
                                                                type: 'CUSTOM_LIBRARY_RULE',
                                                                customRuleId: cr.id,
                                                                evaluated_hours: cr.evaluated_hours,
                                                                evaluated_addons: cr.evaluated_addons,
                                                                transfer_out_hours: cr.transfer_out_hours,
                                                                transfer_to_id: cr.transfer_to_id || ''
                                                            }
                                                        })}
                                                    />
                                                    <span className={`font-bold text-xs ${formData.rule.customRuleId === cr.id ? 'text-indigo-900' : 'text-slate-800'}`}>Library: {cr.name}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 pl-5 leading-tight">{cr.description || 'Custom rule from library.'}</p>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Parameters based on standard rule types */}
                                    {formData.rule.type === 'STANDARD_MAX' && <div><label className="text-xs font-bold">Max hours (h/week)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.maxHrs || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, maxHrs: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>}
                                    {formData.rule.type === 'GUARANTEED_MIN_HOURS' && <div><label className="text-xs font-bold">Min hours (h/week)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.guaranteedBaseHrs || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, guaranteedBaseHrs: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>}
                                    {formData.rule.type === 'FIXED_TOTAL' && <div className="flex gap-4">
                                        <div className="flex-1"><label className="text-xs font-bold">Fixed hours (h)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.fixedHrs || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, fixedHrs: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>
                                        <div className="flex-1"><label className="text-xs font-bold">Fixed addons ($)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.fixedTip || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, fixedTip: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>
                                    </div>}

                                    {formData.rule.type === 'CHECK_PLUS_CASH' && <div className="flex gap-4">
                                        <div className="flex-1"><label className="text-xs font-bold">Check Hours (h)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.fixedCheckHrs || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, fixedCheckHrs: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>
                                        <div className="flex-1"><label className="text-xs font-bold">Check Addons ($)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.fixedCheckTip || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, fixedCheckTip: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>
                                    </div>}
                                    {formData.rule.type === 'COST_ALLOCATION_OUT_FLAT' && <div><label className="text-xs font-bold">Hours to transfer (h/week)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.hrsToGive || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, hrsToGive: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>}
                                    {formData.rule.type === 'COST_ALLOCATION_OUT_PERCENT' && <div><label className="text-xs font-bold">Max own hours to keep (h/week)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.maxOwnHrs || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, maxOwnHrs: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>}
                                    {(formData.rule.type === 'COST_ALLOCATION_IN_FLAT' || formData.rule.type === 'COST_ALLOCATION_IN_PERCENT') && (
                                        <div className="mb-2">
                                            <label className="text-xs font-bold">Source Employee ID</label>
                                            <select disabled={isReadOnly} className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100 focus:border-indigo-500 outline-none bg-white" value={formData.rule.parentId || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, parentId: e.target.value}})}>
                                                <option value="">Select Employee...</option>
                                                {employees.filter((e: Employee) => e.id !== formData.id).map((e: Employee) => (
                                                    <option key={e.id} value={e.id}>{e.nickname} (ID: {e.id})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {formData.rule.type === 'COST_ALLOCATION_IN_PERCENT' && <div className="flex gap-4">
                                        <div className="flex-1"><label className="text-xs font-bold">Receive Hours (%)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.hrsPercent || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, hrsPercent: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>
                                        <div className="flex-1"><label className="text-xs font-bold">Receive Addons (%)</label><input disabled={isReadOnly} type="number" className="w-full p-1.5 border rounded-md mt-1 disabled:bg-slate-100" value={formData.rule.tipPercent || ''} onChange={e=>setFormData({...formData, rule: {...formData.rule, tipPercent: e.target.value === '' ? undefined : parseFloat(e.target.value)}})} /></div>
                                    </div>}
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
                            {canEdit && modalState.isEditing ? (
                                <button type="button" onClick={handleDeleteClick} className="text-rose-600 font-bold hover:text-rose-700 text-sm">Delete</button>
                            ) : <div></div>}
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setModalState({ isOpen: false, isEditing: false, empId: null })} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors text-sm">Cancel</button>
                                {canEdit && (
                                    <button type="submit" form="empForm" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer text-sm">
                                        {modalState.isEditing ? 'Save Changes' : 'Add Employee'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
