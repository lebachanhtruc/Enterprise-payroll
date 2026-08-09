import React from 'react';
import { Lock, LogOut } from 'lucide-react';

interface WorkspaceGuardProps {
    userEmail?: string | null;
    onSignOut: () => void;
}

export default function WorkspaceGuard({ userEmail, onSignOut }: WorkspaceGuardProps) {
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 shadow-sm border border-rose-100">
                    <Lock size={40} strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Workspace Locked</h2>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    Your account <span className="font-bold text-slate-800">{userEmail}</span> is currently in a holding state. You have not been assigned to any restaurant workspace yet.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 text-sm text-slate-600 font-semibold">
                    Please contact your Workspace Owner / Administrator to grant you role-based access.
                </div>
                <button 
                    onClick={onSignOut}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </div>
        </div>
    );
}
