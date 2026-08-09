import React from 'react';
import { Cpu, Lock, LogOut, User, Compass } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTour } from '../contexts/TourContext';

export interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    hideFor?: string[];
}

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    role: string | null;
    setRole?: (role: string | null) => void;
    companyId: string | null;
    userEmail?: string | null;
    isDemoUser?: boolean;
    onSignOut: () => void;
    navItems: NavItem[];
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (val: boolean) => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (val: boolean) => void;
}

export default function Sidebar({
    activeTab,
    setActiveTab,
    role,
    setRole,
    companyId,
    userEmail,
    isDemoUser,
    onSignOut,
    navItems,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showToast,
    showConfirm,
    isMobileMenuOpen,
    setIsMobileMenuOpen
}: SidebarProps) {
    const visibleNavItems = navItems.filter(item => !(item.hideFor && role && item.hideFor.includes(role)));
    const { startTour } = useTour();

    return (
        <aside className={cn(
            "w-72 bg-sidebar-bg border-r border-sidebar-border text-slate-400 flex flex-col print-hidden",
            "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                        <Cpu size={18} strokeWidth={2.5} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">PAYROLL</h1>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold px-1 mb-6">Enterprise Edition</p>
            </div>
            <nav className="flex-1 px-4 space-y-1 mt-4">
                {visibleNavItems.map((item) => {
                    return (
                        <button
                            key={item.id}
                            onClick={async () => {
                                if (hasUnsavedChanges) {
                                    const confirmed = await showConfirm(
                                        'Discard changes?',
                                        'You have unsaved timesheet data. Are you sure you want to discard these changes and leave?'
                                    );
                                    if (!confirmed) return;
                                    setHasUnsavedChanges(false);
                                }
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left whitespace-nowrap mb-1",
                                activeTab === item.id 
                                    ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500" 
                                    : "border-l-4 border-transparent hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} /> {item.label}
                            </div>
                        </button>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
                        <User size={20} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate" title={userEmail || 'Unknown User'}>
                            {isDemoUser ? (role === 'OWNER' ? 'Demo Owner' : role === 'MANAGER' ? 'Demo Manager' : 'Demo Staff') : (userEmail || 'Unknown User')}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{userEmail}</p>
                    </div>
                </div>

                {isDemoUser && setRole && (
                    <div className="mb-4 bg-slate-800/80 p-3.5 rounded-xl border border-indigo-500/50 shadow-lg shadow-indigo-900/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50 pointer-events-none"></div>
                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Cpu size={14} /> Role Switcher
                        </label>
                        <select 
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all cursor-pointer hover:border-slate-500 relative z-10"
                            value={role || 'OWNER'}
                            onChange={(e) => {
                                setRole(e.target.value);
                                setActiveTab('dashboard'); // reset to dashboard on switch
                            }}
                        >
                            <option value="OWNER">ADMIN (Full Access)</option>
                            <option value="MANAGER">MANAGER (Team View)</option>
                            <option value="STAFF">STAFF (Self View)</option>
                        </select>
                    </div>
                )}

                <button
                    onClick={() => {
                        setIsMobileMenuOpen(false);
                        startTour('onboarding');
                    }}
                    className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent hover:border-slate-700"
                >
                    <Compass size={16} /> Start Setup Guide
                </button>

                <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left whitespace-nowrap text-slate-400 hover:bg-white/5 hover:text-white"
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </div>
        </aside>
    );
}
