import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, Terminal, Users, UserPlus, X, BookOpen, Plus, AlertTriangle, Trash2, Edit, Key, Sparkles, Play, Lightbulb } from 'lucide-react';
import DevTestRunner from './DevTestRunner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { SystemSettings, CustomRule } from '../types';

interface SettingsPanelProps {
    settings: SystemSettings;
    setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
    setActiveTab: (tab: string) => void;
}

export interface WorkspaceUser {
    id: string;
    email: string;
    role: string;
}

interface CustomRuleMetadata {
    text: string;
    createdBy: string;
    creatorRole: string;
    createdAt: string;
}

const parseRuleMetadata = (desc: string): CustomRuleMetadata => {
    try {
        const parsed = JSON.parse(desc);
        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
            return parsed;
        }
    } catch (e) {
        // Fallback for rules saved before this feature
    }
    return {
        text: desc || '',
        createdBy: 'Unknown',
        creatorRole: 'Unknown',
        createdAt: ''
    };
};

const ROLE_PRIORITY: Record<string, number> = { 'OWNER': 3, 'MANAGER': 2, 'FINANCE': 1, 'STAFF': 0 };

export default function SettingsPanel({ settings, setSettings, setActiveTab }: SettingsPanelProps) {
    const { user, role, session } = useAuth();
    const { showToast, showConfirm } = useUI();
    const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
    
    // Workspace Users state
    const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    
    // Form state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('MANAGER');
    const [isGranting, setIsGranting] = useState(false);

    // Custom Rules state
    const [customRules, setCustomRules] = useState<CustomRule[]>([]);
    const [loadingRules, setLoadingRules] = useState(false);
    const [isCreatingRule, setIsCreatingRule] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [newRule, setNewRule] = useState<Partial<CustomRule> & { human_explanation?: string }>({
        name: '',
        description: '',
        ai_prompt: '',
        evaluated_hours: '',
        evaluated_addons: '',
        transfer_out_hours: '',
        transfer_to_id: null,
        human_explanation: ''
    });
    
    // Password Verification State
    const [passwordModal, setPasswordModal] = useState<{isOpen: boolean, action: (() => Promise<void>) | null}>({isOpen: false, action: null});
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const aiResultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (newRule.human_explanation && aiResultRef.current) {
            aiResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [newRule.human_explanation]);

    useEffect(() => {
        if (settings.companyId) {
            fetchWorkspaceUsers();
            fetchCustomRules();
        } else {
            setWorkspaceUsers([]);
            setCustomRules([]);
        }
    }, [settings.companyId]);

    const fetchWorkspaceUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', settings.companyId)
                .order('email', { ascending: true });
            
            if (error) throw error;
            setWorkspaceUsers(data || []);
        } catch (error) {
            console.error('Error fetching workspace users:', error);
            showToast('Failed to load workspace users.', 'error');
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchCustomRules = async () => {
        if (!settings.companyId) return;
        setLoadingRules(true);
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
        } finally {
            setLoadingRules(false);
        }
    };

    const handleGrantAccess = async () => {
        if (!newUserEmail.trim()) {
            showToast('Please enter an email address.', 'error');
            return;
        }

        setIsGranting(true);
        try {
            // Find user by email
            const { data: profiles, error: searchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', newUserEmail.trim().toLowerCase());
            
            if (searchError) throw searchError;
            
            if (!profiles || profiles.length === 0) {
                showToast('User not found. Ask them to sign up first.', 'error');
                return;
            }

            const targetUser = profiles[0];

            // Update user's company_id and role
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    company_id: settings.companyId,
                    role: newUserRole
                })
                .eq('id', targetUser.id);
            
            if (updateError) throw updateError;

            showToast(`Access granted to ${targetUser.email || newUserEmail}`, 'success');
            setNewUserEmail('');
            setNewUserRole('MANAGER');
            fetchWorkspaceUsers();
            
        } catch (error) {
            console.error('Error granting access:', error);
            showToast('Failed to grant access.', 'error');
        } finally {
            setIsGranting(false);
        }
    };

    const handleRevokeAccess = async (profileId: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    company_id: null,
                    role: 'MANAGER'
                })
                .eq('id', profileId);
            
            if (error) throw error;
            
            showToast('Access revoked successfully.', 'success');
            fetchWorkspaceUsers();
        } catch (error) {
            console.error('Error revoking access:', error);
            showToast('Failed to revoke access.', 'error');
        }
    };

    const handleGenerateAiRule = async () => {
        const prompt = newRule.ai_prompt;
        if (!prompt || !prompt.trim()) {
            setAiError("Please type a rule in plain English first.");
            return;
        }
        setAiLoading(true);
        setAiError('');
        try {
            const response = await fetch('/api/generate-rule', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ prompt: prompt.trim() })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to call Gemini API");
            }
            const data = await response.json();
            setNewRule({
                ...newRule,
                evaluated_hours: data.evaluated_hours || '0',
                evaluated_addons: data.evaluated_addons || '0',
                transfer_out_hours: data.transfer_out_hours || '0',
                transfer_to_id: data.transfer_to_id || null,
                human_explanation: data.human_explanation || ''
            });
        } catch (err: any) {
            console.error("AI rule generation error:", err);
            let errorMsg = err?.message || "An error occurred while generating the rule.";
            
            if (typeof errorMsg === 'string') {
                if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota')) {
                    errorMsg = "AI is currently busy (Rate Limit). Please wait a moment and try again.";
                } else if (errorMsg.length > 100) {
                    errorMsg = "Generation failed. Please check the console for details.";
                }
            }
            
            setAiError(errorMsg);
        } finally {
            setAiLoading(false);
        }
    };

    const handleSaveCustomRule = async () => {
        if (!newRule.name) {
            showToast('Rule Name is required.', 'error');
            return;
        }
        if (!newRule.ai_prompt && !newRule.evaluated_hours) {
            showToast('You must provide either an AI prompt or manual formulas.', 'error');
            return;
        }
        if (!settings.companyId) {
            showToast('No company ID found.', 'error');
            return;
        }

        try {
            const metadata: CustomRuleMetadata = {
                text: newRule.description || '',
                createdBy: editingRuleId ? (parseRuleMetadata(customRules.find(r => r.id === editingRuleId)?.description || '').createdBy) : (user?.email || 'Unknown'),
                creatorRole: editingRuleId ? (parseRuleMetadata(customRules.find(r => r.id === editingRuleId)?.description || '').creatorRole) : (role || 'Unknown'),
                createdAt: editingRuleId ? (parseRuleMetadata(customRules.find(r => r.id === editingRuleId)?.description || '').createdAt) : new Date().toISOString()
            };
            const descToSave = JSON.stringify(metadata);

            if (editingRuleId) {
                const { error } = await supabase
                    .from('custom_rules')
                    .update({
                        name: newRule.name,
                        description: descToSave,
                        ai_prompt: newRule.ai_prompt || '',
                        evaluated_hours: newRule.evaluated_hours || '0',
                        evaluated_addons: newRule.evaluated_addons || '0',
                        transfer_out_hours: newRule.transfer_out_hours || '0',
                        transfer_to_id: newRule.transfer_to_id || null
                    })
                    .eq('id', editingRuleId);
                
                if (error) throw error;
                showToast('Custom rule updated successfully.', 'success');
            } else {
                const { error } = await supabase
                    .from('custom_rules')
                    .insert([{
                        company_id: settings.companyId,
                        name: newRule.name,
                        description: descToSave,
                        ai_prompt: newRule.ai_prompt || '',
                        evaluated_hours: newRule.evaluated_hours || '0',
                        evaluated_addons: newRule.evaluated_addons || '0',
                        transfer_out_hours: newRule.transfer_out_hours || '0',
                        transfer_to_id: newRule.transfer_to_id || null
                    }]);
                
                if (error) throw error;
                showToast('Custom rule saved successfully.', 'success');
            }
            
            setIsCreatingRule(false);
            setEditingRuleId(null);
            setNewRule({
                name: '',
                description: '',
                ai_prompt: '',
                evaluated_hours: '',
                evaluated_addons: '',
                transfer_out_hours: '',
                transfer_to_id: null,
                human_explanation: ''
            });
            fetchCustomRules();
        } catch (error) {
            console.error('Error saving custom rule:', error);
            showToast('Failed to save custom rule.', 'error');
        }
    };

    const handleEditCustomRuleClick = async (rule: CustomRule) => {
        const metadata = parseRuleMetadata(rule.description);
        const currentRolePrio = ROLE_PRIORITY[role || 'STAFF'] || 0;
        const creatorRolePrio = ROLE_PRIORITY[metadata.creatorRole] || 0;
        
        if (currentRolePrio < creatorRolePrio) {
            showToast('You do not have permission to edit rules created by higher ranking roles.', 'error');
            return;
        }

        const confirmed = await showConfirm(
            'Edit Custom Rule',
            'Are you sure you want to edit this custom rule? Any employees using this rule might have their payroll calculations affected.'
        );
        if (confirmed) {
            setNewRule({
                name: rule.name,
                description: metadata.text,
                ai_prompt: rule.ai_prompt,
                evaluated_hours: rule.evaluated_hours,
                evaluated_addons: rule.evaluated_addons,
                transfer_out_hours: rule.transfer_out_hours,
                transfer_to_id: rule.transfer_to_id
            });
            setEditingRuleId(rule.id);
            setIsCreatingRule(true);
        }
    };

    const handleDeleteCustomRuleClick = async (ruleId: string) => {
        const rule = customRules.find(r => r.id === ruleId);
        if (!rule) return;

        const metadata = parseRuleMetadata(rule.description);
        const currentRolePrio = ROLE_PRIORITY[role || 'STAFF'] || 0;
        const creatorRolePrio = ROLE_PRIORITY[metadata.creatorRole] || 0;
        
        if (currentRolePrio < creatorRolePrio) {
            showToast('You do not have permission to delete rules created by higher ranking roles.', 'error');
            return;
        }

        const confirmed = await showConfirm(
            'Delete Custom Rule',
            'Are you sure you want to delete this custom rule? This action cannot be undone.'
        );
        if (!confirmed) return;

        setPasswordModal({
            isOpen: true,
            action: async () => {
                try {
                    const { error } = await supabase
                        .from('custom_rules')
                        .delete()
                        .eq('id', ruleId);
                    
                    if (error) throw error;
                    
                    showToast('Custom rule deleted.', 'success');
                    fetchCustomRules();
                } catch (error) {
                    console.error('Error deleting rule:', error);
                    showToast('Failed to delete rule.', 'error');
                }
            }
        });
    };

    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput || !user?.email) return;
        setIsVerifyingPassword(true);
        setPasswordError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordInput,
            });

            if (error) {
                setPasswordError('Incorrect password. Please try again.');
                setIsVerifyingPassword(false);
                return;
            }

            // Password is correct, execute the action
            if (passwordModal.action) {
                await passwordModal.action();
            }

            // Reset and close
            setPasswordModal({ isOpen: false, action: null });
            setPasswordInput('');
        } catch (err) {
            setPasswordError('An unexpected error occurred.');
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative">
            <h3 className="text-2xl font-black text-slate-900 mb-8 border-b pb-4 flex items-center gap-3">
                <Settings className="text-slate-400" /> System Configuration
            </h3>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Workspace</label>
                    <div className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-bold text-lg text-slate-800 shadow-inner">
                        {settings.companyName || 'Loading Workspace...'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Period Start Date</label>
                        <input 
                            type="date"
                            className="w-full p-4 border rounded-xl outline-none focus:border-indigo-500 font-mono" 
                            value={settings.periodStart}
                            onChange={(e) => {
                                const newStartStr = e.target.value;
                                if (!newStartStr) {
                                    setSettings({...settings, periodStart: newStartStr});
                                    return;
                                }
                                const startDate = new Date(newStartStr + 'T12:00:00Z');
                                if (isNaN(startDate.getTime())) {
                                    setSettings({...settings, periodStart: newStartStr});
                                    return;
                                }
                                // calculate end date as start date + 13 days (total 14 days)
                                const endDate = new Date(startDate);
                                endDate.setDate(endDate.getDate() + 13);
                                const newEndStr = endDate.toISOString().split('T')[0];
                                setSettings({...settings, periodStart: newStartStr, periodEnd: newEndStr});
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Period End Date</label>
                        <input 
                            type="date"
                            className="w-full p-4 border rounded-xl outline-none focus:border-indigo-500 font-mono bg-slate-50 cursor-not-allowed" 
                            value={settings.periodEnd}
                            disabled
                            onChange={(e) => setSettings({...settings, periodEnd: e.target.value})}
                        />
                    </div>
                </div>
                
                {/* Workspace Access Control */}
                <div className="pt-8 border-t border-slate-200">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Users className="text-slate-400" /> Workspace Access Control
                    </h4>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Grant Access to New User</label>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">User Email</label>
                                <input 
                                    type="email" 
                                    placeholder="email@example.com"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                                <select 
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                    className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 bg-white"
                                >
                                    <option value="MANAGER">Manager</option>
                                    <option value="FINANCE">Finance</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleGrantAccess}
                                disabled={isGranting}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 h-[50px]"
                            >
                                <UserPlus size={18} /> {isGranting ? 'Granting...' : 'Grant Access'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Workspace Users</label>
                        {loadingUsers ? (
                            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Loading users...</div>
                        ) : workspaceUsers.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">No users found in this workspace.</div>
                        ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Role</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {workspaceUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-medium text-slate-800">{u.email || 'Unknown Email'}</td>
                                                <td className="p-4">
                                                    <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg ${u.role === 'OWNER' ? 'bg-indigo-100 text-indigo-700' : u.role === 'FINANCE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {u.role || 'UNKNOWN'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {user?.id !== u.id && u.role !== 'OWNER' && (
                                                        <button 
                                                            onClick={() => handleRevokeAccess(u.id)}
                                                            className="text-rose-600 hover:text-rose-700 font-bold text-sm flex items-center gap-1 justify-end w-full"
                                                            title="Revoke Access"
                                                        >
                                                            <X size={16} /> Revoke
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Custom Rule Library */}
                <div className="pt-8 border-t border-slate-200" data-tour="step-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <BookOpen className="text-slate-400" /> Custom Rule Library
                        </h4>
                        {!isCreatingRule && (
                            <button 
                                onClick={() => setIsCreatingRule(true)}
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 text-sm"
                            >
                                <Plus size={16} /> Create New Custom Rule
                            </button>
                        )}
                    </div>

                    {isCreatingRule ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h5 className="font-bold text-slate-800">{editingRuleId ? 'Edit Custom Rule' : 'Create New Custom Rule'}</h5>
                                <button 
                                    onClick={() => {
                                        setIsCreatingRule(false);
                                        setEditingRuleId(null);
                                        setAiError('');
                                        setNewRule({
                                            name: '',
                                            description: '',
                                            ai_prompt: '',
                                            evaluated_hours: '',
                                            evaluated_addons: '',
                                            transfer_out_hours: '',
                                            transfer_to_id: null,
                                            human_explanation: ''
                                        });
                                    }} 
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Rule Name <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g., Senior Partner Split"
                                            value={newRule.name || ''}
                                            onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                                            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                                        <input 
                                            type="text" 
                                            placeholder="Briefly describe this rule..."
                                            value={newRule.description || ''}
                                            onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                                            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 bg-white"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Prompt</label>
                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => setNewRule({...newRule, ai_prompt: 'Cap at 20h/week for kitchen staff, transfer the rest to employee ID 5'})}
                                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors"
                                            >
                                                Cap Kitchen Staff
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setNewRule({...newRule, ai_prompt: 'Guarantee minimum 30h/week for front-of-house even if worked less'})}
                                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors"
                                            >
                                                Guarantee 30h FOH
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setNewRule({...newRule, ai_prompt: 'Standard rate, keep maximum 40 hours a week for bartenders, any excess hours are paid as standard addons at standard rate'})}
                                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors"
                                            >
                                                Overtime as Addons
                                            </button>
                                        </div>
                                    </div>
                                    <textarea 
                                        rows={3}
                                        placeholder='e.g., "Keep max 20 hours and transfer the rest to employee ID 5"'
                                        value={newRule.ai_prompt || ''}
                                        onChange={(e) => setNewRule({...newRule, ai_prompt: e.target.value})}
                                        className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 bg-white text-sm"
                                    />
                                </div>

                                <div className="flex justify-between items-center">
                                    <button
                                        type="button"
                                        disabled={aiLoading}
                                        onClick={handleGenerateAiRule}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                        {aiLoading 
                                                ? (
                                                    <>
                                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                        Generating Rule...
                                                    </>
                                                ) 
                                                : "Generate via AI"
                                        }
                                    </button>
                                    <div className="flex items-center gap-4">
                                        {aiError && <span className="text-xs font-semibold text-rose-500 max-w-[200px] text-right">{aiError}</span>}
                                        <div className="flex flex-col items-end gap-1">
                                            <button
                                            type="button"
                                            disabled={!newRule.evaluated_hours || aiLoading}
                                            onClick={() => setIsTestRunnerOpen(true)}
                                            title={!newRule.evaluated_hours ? "Generate a rule first" : "Test this Rule in Sandbox"}
                                            className={`px-6 py-3 font-bold rounded-xl transition-all flex items-center gap-2 text-sm relative ${
                                                !newRule.evaluated_hours || aiLoading
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/40 ring-4 ring-emerald-500/30'
                                            }`}
                                        >
                                            <Play size={16} /> Test this Rule in Sandbox
                                        </button>
                                        {newRule.evaluated_hours && !aiLoading && (
                                            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest animate-pulse mt-0.5">✨ Ready to test</span>
                                        )}
                                        </div>
                                    </div>
                                </div>

                                <div ref={aiResultRef}>
                                    {newRule.human_explanation && !aiLoading && (
                                        <div className="bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-500 p-6 rounded-r-xl rounded-l-sm mt-6 shadow-sm relative overflow-hidden">
                                            <div className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2 relative z-10">
                                                <Lightbulb size={18} className="text-emerald-600" /> AI Explanation
                                            </div>
                                            <div className="text-base text-emerald-950 leading-relaxed font-medium relative z-10">
                                                {newRule.human_explanation}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Preview / Manual Override Section */}
                                <div className="p-5 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs shadow-inner border border-slate-800 mt-4">
                                    <div className="text-[11px] text-indigo-400 font-bold uppercase tracking-wide border-b border-slate-800 pb-2 mb-4 flex items-center gap-2">
                                        <Terminal size={14} /> MANUAL CONFIGURATION (EXCEL-LIKE FORMULAS)
                                    </div>
                                    
                                    <div className="mb-5 space-y-3 text-slate-300">
                                        <p className="text-slate-400">If AI generation is unavailable, you can manually input numbers or formulas here. The syntax is very similar to Excel.</p>
                                        
                                        <div className="flex flex-wrap gap-4 text-[10px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                            <div><span className="text-emerald-400 font-bold">totalHrs</span> : Total hours worked (2 weeks)</div>
                                            <div><span className="text-emerald-400 font-bold">totalTips</span> : Total addons/tips</div>
                                            <div><span className="text-emerald-400 font-bold">standardRate</span> : Base hourly rate</div>
                                        </div>
                                
                                        <div className="bg-slate-800/50 p-3 rounded-lg space-y-2 border border-slate-700/50">
                                            <div className="text-[10px] font-bold text-slate-400 mb-1">COMMON SCENARIOS:</div>
                                            <div className="flex justify-between items-center border-b border-slate-700/50 pb-1.5">
                                                <span className="text-slate-300">1. Cap at strictly 80h max:</span> 
                                                <code className="text-indigo-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded">Math.min(totalHrs, 80)</code>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-700/50 pb-1.5">
                                                <span className="text-slate-300">2. Fixed contract (e.g., exactly 60h):</span> 
                                                <code className="text-indigo-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded">60</code>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-700/50 pb-1.5">
                                                <span className="text-slate-300">3. Calculate excess hours over 80h:</span> 
                                                <code className="text-indigo-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded">Math.max(0, totalHrs - 80)</code>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-300">4. Pay all hours dynamically as Addons:</span> 
                                                <code className="text-indigo-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded">totalHrs * standardRate</code>
                                            </div>
                                        </div>
                                    </div>
                                
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-indigo-400 font-semibold uppercase text-[10px]">checkHrs2Wk (Hours)</label>
                                            <input 
                                                disabled={false}
                                                type="text" 
                                                className="bg-slate-950 text-emerald-400 border border-slate-700 outline-none p-2 rounded-lg font-mono text-left focus:border-indigo-500 transition-colors"
                                                value={newRule.evaluated_hours || ''} 
                                                onChange={e => setNewRule({...newRule, evaluated_hours: e.target.value})}
                                                placeholder="e.g. 60 or Math.min(totalHrs, 80)"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-indigo-400 font-semibold uppercase text-[10px]">standardAddOns ($)</label>
                                            <input 
                                                disabled={false}
                                                type="text" 
                                                className="bg-slate-950 text-emerald-400 border border-slate-700 outline-none p-2 rounded-lg font-mono text-left focus:border-indigo-500 transition-colors"
                                                value={newRule.evaluated_addons || ''} 
                                                onChange={e => setNewRule({...newRule, evaluated_addons: e.target.value})}
                                                placeholder="e.g. 300 or totalTips"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-indigo-400 font-semibold uppercase text-[10px]">overHrsToGive (Transfer Out)</label>
                                            <input 
                                                disabled={false}
                                                type="text" 
                                                className="bg-slate-950 text-emerald-400 border border-slate-700 outline-none p-2 rounded-lg font-mono text-left focus:border-indigo-500 transition-colors"
                                                value={newRule.transfer_out_hours || ''} 
                                                onChange={e => setNewRule({...newRule, transfer_out_hours: e.target.value})}
                                                placeholder="e.g. Math.max(0, totalHrs - 80)"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-indigo-400 font-semibold uppercase text-[10px]">transferToId (Target EMP ID)</label>
                                            <input 
                                                disabled={false}
                                                type="text" 
                                                className="bg-slate-950 text-amber-400 border border-slate-700 outline-none p-2 rounded-lg font-mono text-left focus:border-amber-500 transition-colors"
                                                value={newRule.transfer_to_id || ''} 
                                                onChange={e => setNewRule({...newRule, transfer_to_id: e.target.value})}
                                                placeholder="e.g. 5"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={handleSaveCustomRule}
                                        className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={18} /> Save Rule
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {loadingRules ? (
                                <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Loading custom rules...</div>
                            ) : customRules.length === 0 ? (
                                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
                                    <BookOpen className="text-slate-300 mb-2" size={32} />
                                    <p className="text-slate-500 font-semibold mb-1">No custom rules yet.</p>
                                    <p className="text-slate-400 text-sm">Create standard reusable rules using the AI Copilot to quickly assign them to employees.</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="p-4">Name & Description</th>
                                                <th className="p-4">Compiler Output</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {customRules.map((rule) => {
                                                const meta = parseRuleMetadata(rule.description);
                                                return (
                                                <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-800">{rule.name}</div>
                                                        <div className="text-xs text-slate-500 mt-1">{meta.text}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-1 italic truncate max-w-xs" title={rule.ai_prompt}>
                                                            {rule.ai_prompt ? `"${rule.ai_prompt}"` : '[ Manual Configuration ]'}
                                                        </div>
                                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                                                            <div className="flex items-center gap-1">
                                                                <Users size={12} /> {meta.createdBy}
                                                            </div>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${meta.creatorRole === 'OWNER' ? 'bg-indigo-100 text-indigo-700' : meta.creatorRole === 'FINANCE' ? 'bg-emerald-100 text-emerald-700' : meta.creatorRole === 'MANAGER' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{meta.creatorRole}</span>
                                                            {meta.createdAt && <span>• {new Date(meta.createdAt).toLocaleDateString()}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-mono text-[10px] space-y-1 bg-slate-100 p-2 rounded-lg border border-slate-200 inline-block text-slate-600">
                                                            <div><span className="text-indigo-500 font-bold">hrs:</span> {rule.evaluated_hours || '0'}</div>
                                                            <div><span className="text-emerald-500 font-bold">addons:</span> {rule.evaluated_addons || '0'}</div>
                                                            <div><span className="text-rose-500 font-bold">out:</span> {rule.transfer_out_hours || '0'} 
                                                                 {rule.transfer_to_id && rule.transfer_to_id !== 'null' ? ` (to ${rule.transfer_to_id})` : ''}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex flex-col gap-2 justify-end items-end">
                                                            <button 
                                                                onClick={() => handleEditCustomRuleClick(rule)}
                                                                className="text-indigo-600 hover:text-indigo-700 font-bold text-sm flex items-center gap-1"
                                                                title="Edit Rule"
                                                            >
                                                                <Edit size={16} /> Edit
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteCustomRuleClick(rule.id)}
                                                                className="text-rose-600 hover:text-rose-700 font-bold text-sm flex items-center gap-1"
                                                                title="Delete Rule"
                                                            >
                                                                <Trash2 size={16} /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-8 flex justify-between gap-4">
                    <button onClick={() => setActiveTab('dashboard')} className="flex-1 p-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm" title="Save current system configurations">
                        <Save size={20} /> Save & Continue
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col items-center">
                    <button 
                        onClick={() => setIsTestRunnerOpen(true)}
                        className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-800 shadow-md text-sm active:scale-95 cursor-pointer"
                        title="Run in-app system integration tests"
                    >
                        <Terminal size={18} className="text-indigo-400" />
                        Developer: Run System Tests
                    </button>
                </div>

                            <DevTestRunner isOpen={isTestRunnerOpen} onClose={() => setIsTestRunnerOpen(false)} customRuleToTest={newRule} />
            </div>
            
            {passwordModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-600">
                                <Key size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">Verify Password</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Please enter your account password to confirm this action.
                            </p>
                            
                            <form onSubmit={handleVerifyPassword}>
                                <div className="space-y-4">
                                    <div>
                                        <input
                                            type="password"
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                            placeholder="Enter your password..."
                                            autoFocus
                                            required
                                        />
                                        {passwordError && (
                                            <p className="text-rose-500 text-xs mt-2 font-medium">{passwordError}</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPasswordModal({ isOpen: false, action: null });
                                                setPasswordInput('');
                                                setPasswordError('');
                                            }}
                                            className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                                            disabled={isVerifyingPassword}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!passwordInput || isVerifyingPassword}
                                            className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                        >
                                            {isVerifyingPassword ? 'Verifying...' : 'Confirm'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
