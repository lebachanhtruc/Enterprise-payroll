console.log("Force Rebuild - Cache Busting v1");

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Loader2, User, CheckCircle2, Circle } from 'lucide-react';

export default function Login({ isHydratingDemo }: { isHydratingDemo?: boolean }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const isDemoLoading = demoLoading || isHydratingDemo;
    const { showToast } = useUI();
    const { refreshProfile } = useAuth();

    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber;

    const handleDemoLogin = async () => {
        setDemoLoading(true);
        try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) {
                showToast(error.message, 'error');
                setDemoLoading(false);
                return;
            }
            
            if (data.user?.id) {
                let company_id = null;
                let attempts = 0;
                while (attempts < 10) {
                    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', data.user.id).single();
                    if (profile?.company_id) {
                        company_id = profile.company_id;
                        break;
                    }
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }

                if (!company_id) {
                    throw new Error('Timeout waiting for profile creation');
                }

                const mockEmployees = [
                    // BOH
                    { nickname: 'Truc Le', tax_name: 'Ba Chanh Truc Le', custom_rate: 25.00, standard_rate: 25.00, sin: '', address: '', rule: { type: 'FIXED_TOTAL', fixedHrs: 40, fixedTip: 700 } },
                    { nickname: 'JP', tax_name: 'Jean-Paul Tremblay', custom_rate: 22.00, standard_rate: 22.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 44 } },
                    { nickname: 'Sophie', tax_name: 'Sophie Dinh', custom_rate: 20.00, standard_rate: 20.00, sin: '', address: '', rule: { type: 'GUARANTEED_MIN_HOURS', guaranteedBaseHrs: 35 } },
                    { nickname: 'Luc', tax_name: 'Lucas Fortin', custom_rate: 19.00, standard_rate: 19.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    { nickname: 'Minh', tax_name: 'Le Minh', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    { nickname: 'Dave', tax_name: 'David Cote', custom_rate: 20.00, standard_rate: 20.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    { nickname: 'Bella', tax_name: 'Isabella Gagnon', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    { nickname: 'Thomas', tax_name: 'Thomas Bouchard', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    { nickname: 'Khoa', tax_name: 'Tran Dang Khoa', custom_rate: 19.50, standard_rate: 19.50, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    { nickname: 'Alex', tax_name: 'Alexandre Roy', custom_rate: 22.00, standard_rate: 22.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    { nickname: 'Marie', tax_name: 'Marie Pelletier', custom_rate: 18.50, standard_rate: 18.50, sin: '', address: '', rule: { type: 'GUARANTEED_MIN_HOURS', guaranteedBaseHrs: 30 } },
                    { nickname: 'Hugo', tax_name: 'Hugo Lavoie', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
                    // FOH
                    { nickname: 'Chloe', tax_name: 'Chloe Dubois', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'CHECK_PLUS_CASH', fixedCheckHrs: 10, fixedCheckTip: 30 } },
                    { nickname: 'Kevin', tax_name: 'Dang Tuan Kiet', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_OUT_PERCENT', maxOwnHrs: 20 } },
                    { nickname: 'Hai', tax_name: 'Nguyen Vu Hai', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_PERCENT', hrsPercent: 40, tipPercent: 40 } },
                    { nickname: 'Emma', tax_name: 'Emma Roy', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_OUT_FLAT', hrsToGive: 15 } },
                    { nickname: 'Liam', tax_name: 'Liam Nguyen', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_FLAT' } },
                    { nickname: 'Olivia', tax_name: 'Olivia Martin', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_PERCENT', hrsPercent: 30, tipPercent: 30 } },
                    { nickname: 'Noah', tax_name: 'Noah Tremblay', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_PERCENT', hrsPercent: 30, tipPercent: 30 } },
                    { nickname: 'Zoe', tax_name: 'Zoe Leblanc', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_FLAT' } }
                ];

                const { error: seedError } = await supabase.rpc('fn_seed_sandbox', { p_company_id: company_id, p_employees: mockEmployees });
                
                if (seedError) {
                    throw new Error(seedError.message || 'Failed to seed sandbox');
                }
                
                await refreshProfile();
                showToast('Sandbox seeded successfully', 'success');
                window.location.href = '/';
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setDemoLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSignUp) {
            if (!fullName.trim()) {
                showToast('Full Name is required', 'error');
                return;
            }
            if (!isPasswordValid) {
                showToast('Please meet all password requirements', 'error');
                return;
            }
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
        }

        setLoading(true);
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName.trim() } }
            });
            
            if (error) {
                showToast(error.message, 'error');
                setLoading(false);
                return;
            }
            
            setLoading(false);
            showToast('Account created successfully! Please wait for Owner approval.', 'success');
            setIsSignUp(false);
            setFullName('');
            setPassword('');
            setConfirmPassword('');
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) {
                showToast(error.message, 'error');
                setLoading(false);
                return;
            }
            
            setLoading(false);
            showToast('Logged in successfully', 'success');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-4">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
                    <p className="text-slate-500 mt-2">Enterprise Payroll SaaS Portal</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input 
                                    type="text" 
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        {isSignUp && (
                            <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password Requirements:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                        {hasMinLength ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />} 8+ characters
                                    </div>
                                    <div className={`flex items-center gap-1.5 transition-colors ${hasUpperCase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                        {hasUpperCase ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />} 1 uppercase
                                    </div>
                                    <div className={`flex items-center gap-1.5 transition-colors ${hasLowerCase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                        {hasLowerCase ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />} 1 lowercase
                                    </div>
                                    <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                        {hasNumber ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />} 1 number
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input 
                                    type="password" 
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                    
                    {isSignUp && (
                        <div className="text-center mt-4">
                            <p className="text-xs text-slate-500 font-medium px-4">
                                Enterprise Security Note: Upon registration, your account will be placed in a secure holding state. Please contact your Workspace Owner to be granted role-based access (Manager/Finance) to your specific restaurant.
                            </p>
                        </div>
                    )}

                    <div className="mt-4 text-center flex flex-col items-center gap-3">
                        <button 
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                        >
                            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                        </button>

                        {!isSignUp && (
                            <>
                                <div className="w-full flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider my-1">
                                    <span className="w-full h-px bg-slate-200"></span>
                                    <span className="px-4">or</span>
                                    <span className="w-full h-px bg-slate-200"></span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDemoLogin}
                                    disabled={isDemoLoading || loading}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isDemoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                    {isDemoLoading ? 'Provisioning your isolated sandbox environment...' : 'Try Interactive Demo'}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
