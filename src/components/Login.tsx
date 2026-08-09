console.log("Force Rebuild - Cache Busting v2");

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from '../contexts/TourContext';
import { Lock, Mail, Loader2, User, CheckCircle2, Circle, Sparkles, FileSpreadsheet, Zap, DollarSign, Download, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

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
    const { startTour } = useTour();

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
                startTour();
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
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            
            {/* LEFT SIDE: Value Proposition */}
            <div className="lg:w-1/2 relative flex flex-col justify-center p-12 lg:p-24 overflow-hidden bg-slate-900">
                {/* Background gradient effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"></div>
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
                <div className="absolute bottom-[0%] right-[0%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px]"></div>

                <div className="relative z-10 max-w-xl mx-auto lg:mx-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold mb-8">
                        <Sparkles className="w-4 h-4" />
                        Interactive Demo Workspace
                    </div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6"
                    >
                        From messy POS data to clean payroll in minutes.
                    </motion.h1>
                    <p className="text-lg text-slate-300 mb-12 leading-relaxed">
                        The only Enterprise Payroll SaaS built specifically for the complex needs of the restaurant industry. Stop doing manual math.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Stop fighting Excel spreadsheets</h3>
                                <p className="text-slate-400 mt-1">No more broken formulas or manual data entry errors at 2 AM.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">AI-Powered Rules</h3>
                                <p className="text-slate-400 mt-1">Write rules in natural language. Our engine turns them into precise math.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Instant Tip Pooling & Overtime</h3>
                                <p className="text-slate-400 mt-1">Handle BOH splits and FOH allocations automatically.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.15)]">
                                <Download className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Audit-ready exports</h3>
                                <p className="text-slate-400 mt-1">Generate clean CSVs ready for any major payroll provider.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Auth Form */}
            <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-6">
                            <Lock className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                        <p className="text-slate-500 mt-2">Sign in to your enterprise portal</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
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
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
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
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
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
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>
                            {isSignUp && (
                                <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password Requirements:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}>
                                            {hasMinLength ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />} 8+ chars
                                        </div>
                                        <div className={`flex items-center gap-1.5 transition-colors ${hasUpperCase ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}>
                                            {hasUpperCase ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />} 1 upper
                                        </div>
                                        <div className={`flex items-center gap-1.5 transition-colors ${hasLowerCase ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}>
                                            {hasLowerCase ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} />} 1 lower
                                        </div>
                                        <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}>
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
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button 
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
                        >
                            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                        </button>

                        {!isSignUp && (
                            <div className="mt-8">
                                <div className="relative flex items-center py-5">
                                    <div className="flex-grow border-t border-slate-200"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">or</span>
                                    <div className="flex-grow border-t border-slate-200"></div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDemoLogin}
                                    disabled={isDemoLoading || loading}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    {isDemoLoading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Provisioning sandbox...</>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Try Interactive Demo
                                            <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-slate-400 mt-4 px-4 leading-relaxed">
                                    No credit card required. Jump into an isolated sandbox populated with mock employees and time data.
                                </p>
                            </div>
                        )}
                        
                        {isSignUp && (
                            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Enterprise Security Note: Upon registration, your account will be placed in a secure holding state. Contact your Workspace Owner to be granted role-based access.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
