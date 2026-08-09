import React from 'react';
import { DollarSign, Clock, FileCheck, AlertTriangle, History, LucideIcon, Compass, Play, Users, Settings, CalendarClock, Download, UserPlus, PlayCircle, Lock, Unlock, CalendarDays, UserMinus, ChevronRight, Activity, Calculator, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  PieChart, Pie, Cell
} from 'recharts';
import { PayrollResult } from '../types';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { Skeleton } from './ui/Skeleton';
import { useTour } from '../contexts/TourContext';

export default function Dashboard({ stats, results, pastMetrics, dbStatus = 'checking', isLoadingEmployees, setActiveTab, employees = [], timesheets = {}, isLocked = false, settings }: { stats: any, results: PayrollResult[], pastMetrics?: any, dbStatus?: 'stable' | 'disconnected' | 'checking', isLoadingEmployees?: boolean, setActiveTab?: any, employees?: any[], timesheets?: any, isLocked?: boolean, settings?: any }) {
    
    const { startTour } = useTour();
    const avgGross = results.length ? results.reduce((acc, r) => acc + r.grossEarnings, 0) / results.length : 0;

    const chartData = results.map(r => {
        const basePay = Math.max(0, r.grossEarnings - r.totalTips);
        return {
            name: r.nickname,
            gross: r.grossEarnings,
            basePay: basePay,
            tips: r.totalTips,
            hrs: r.totalHrs,
        };
    }).sort((a, b) => b.gross - a.gross).slice(0, 10);

    const getComparison = (current: number, past?: number) => {
        if (!past) return null;
        const diff = current - past;
        const percent = (diff / past) * 100;
        return { diff, percent, isUp: diff > 0 };
    };

    const grossComp = getComparison(stats.gross, pastMetrics?.gross);
    const hrsComp = getComparison(stats.hrs, pastMetrics?.hrs);
    const addonsComp = getComparison(stats.addons, pastMetrics?.addons);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                    <p className="font-bold text-slate-800 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                            <span className="font-medium">{entry.name}:</span>
                            <span className="font-bold text-slate-900">
                                {entry.name === 'Total Hours' ? `${entry.value}h` : formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-100 text-sm font-bold text-slate-900">
                        Total Gross: {formatCurrency(payload.find((p: any) => p.dataKey === 'basePay')?.payload.gross || 0)}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (isLoadingEmployees && results.length === 0) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div className="w-1/2">
                                <Skeleton className="h-4 w-2/3 mb-2" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                            <Skeleton className="w-14 h-14 rounded-xl" />
                        </div>
                    ))}
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <Skeleton className="h-6 w-1/3" />
                    </div>
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto py-10" data-tour="step-1">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Welcome to Lime Payroll</h2>
                        <p className="text-slate-500 mt-1">Let's get your first payroll cycle running.</p>
                    </div>
                    <button onClick={() => startTour('onboarding')} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl transition-colors shadow-sm">
                        <Play size={18} /> Play Interactive Guide
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"></div>
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6">
                        <Compass size={40} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-4">Start Your Setup Journey</h3>
                    <p className="text-slate-500 text-lg mb-10 max-w-lg mx-auto">
                        Your dashboard is empty because there are no timesheets or employees configured yet. Follow these three simple steps to unlock the magic of AI payroll.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left relative before:absolute before:top-1/2 before:left-10 before:right-10 before:h-0.5 before:-translate-y-1/2 before:bg-slate-100 before:hidden md:before:block before:z-0">
                        <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl relative z-10 hover:border-indigo-200 transition-colors shadow-sm">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 shadow-sm border border-slate-200 font-black text-lg">1</div>
                            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Settings size={18} className="text-indigo-500" /> Company Settings</h4>
                            <p className="text-sm text-slate-500">Set up your workspace name and standard payroll bi-weekly dates.</p>
                        </div>
                        <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl relative z-10 hover:border-indigo-200 transition-colors shadow-sm">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 shadow-sm border border-slate-200 font-black text-lg">2</div>
                            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Users size={18} className="text-sky-500" /> Add Staff & Rules</h4>
                            <p className="text-sm text-slate-500">Add employees and assign them AI rules to dictate their pay calculations.</p>
                        </div>
                        <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl relative z-10 hover:border-indigo-200 transition-colors shadow-sm">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 shadow-sm border border-slate-200 font-black text-lg">3</div>
                            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><CalendarClock size={18} className="text-emerald-500" /> Input Timesheets</h4>
                            <p className="text-sm text-slate-500">Log weekly hours and tips, then let the engine compile your payroll instantly.</p>
                        </div>
                    </div>

                    <button onClick={() => startTour('onboarding')} className="mt-12 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-600/30 transition-transform hover:-translate-y-1 flex items-center gap-2 mx-auto">
                        <Play fill="currentColor" size={20} /> Start Setup Guide Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-tour="step-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Payroll Dashboard</h2>
                    <p className="text-sm text-slate-500">Overview of current cycle performance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => !isLocked && setActiveTab && setActiveTab('input')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                        <Calculator size={16} /> Process Timesheets
                    </button>
                    <button onClick={() => !isLocked && setActiveTab && setActiveTab('reports')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                        <CheckCircle2 size={16} /> Confirm Payroll
                    </button>
                    <button onClick={() => !isLocked && setActiveTab && setActiveTab('employees')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                        <UserPlus size={16} /> Add Staff
                    </button>
                    <button onClick={() => setActiveTab && setActiveTab('reports')} className="flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors">
                        <Download size={16} /> Export
                    </button>
                    <button onClick={() => startTour('onboarding')} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-lg border border-slate-700 transition-colors ml-auto sm:ml-2">
                        <Compass size={16} /> Tour
                    </button>
                </div>
            </div>

            {/* Layout: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <Card title="Total Payroll" value={formatCurrency(stats.gross)} icon={DollarSign} color="indigo" comp={grossComp} />
                        <Card title="Total Hours" value={`${formatNumber(stats.hrs, 1)}h`} icon={Clock} color="sky" comp={hrsComp} />
                        <Card title="Total Addons" value={formatCurrency(stats.addons)} icon={FileCheck} color="emerald" comp={addonsComp} />
                        <Card title="Avg Cost / Hr" value={stats.hrs > 0 ? formatCurrency(stats.gross / stats.hrs) + '/h' : '—'} icon={Activity} color="teal" />
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Earnings & Hours Analysis (Top 10)</h3>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <defs>
                                        <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0f767e" stopOpacity={1}/>
                                            <stop offset="95%" stopColor="#033337" stopOpacity={1}/>
                                        </linearGradient>
                                        <linearGradient id="colorAddons" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#d97706" stopOpacity={1}/>
                                            <stop offset="95%" stopColor="#78350f" stopOpacity={1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <ReferenceLine yAxisId="left" y={avgGross} stroke="#94a3b8" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'Fleet Average', fill: '#64748b', fontSize: 12 }} />

                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `${val}`} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `${val}h`} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                    <Bar yAxisId="left" dataKey="basePay" name="Base Pay" stackId="a" fill="url(#colorBase)" radius={[0, 0, 4, 4]} barSize={32} />
                                    <Bar yAxisId="left" dataKey="tips" name="Addons" stackId="a" fill="url(#colorAddons)" radius={[4, 4, 0, 0]} barSize={32} />
                                    <Line yAxisId="right" type="monotone" dataKey="hrs" name="Total Hours" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Smart Alerts */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-800 text-sm flex items-center gap-2">
                            <AlertCircle size={16} className="text-indigo-500" /> Action Items
                        </div>
                        <div className="p-2 space-y-1">
                            {isLocked ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-100">
                                    <Lock size={18} className="text-amber-600 shrink-0" />
                                    <div className="text-sm font-semibold">Cycle Locked. Read-only.</div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100">
                                    <Unlock size={18} className="text-emerald-600 shrink-0" />
                                    <div className="text-sm font-semibold">Cycle Open. Edits allowed.</div>
                                </div>
                            )}

                            {(() => {
                                const missing = employees.length - Object.keys(timesheets).length;
                                if (missing > 0) {
                                    return (
                                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent">
                                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                                <UserMinus size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{missing} Missing Timesheets</div>
                                                <div className="text-xs text-slate-500">Employees lacking data</div>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">All Timesheets In</div>
                                            <div className="text-xs text-slate-500">100% submission rate</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {settings?.cycleEndDate && (
                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                        <CalendarDays size={16} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{Math.max(0, Math.ceil((new Date(settings.cycleEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} Days Left</div>
                                        <div className="text-xs text-slate-500">Until period closes</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Donut Chart */}
                    {stats.gross > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-800 text-sm flex items-center gap-2">
                                <PieChart size={16} className="text-sky-500" /> Cost Breakdown
                            </div>
                            <div className="p-6 flex items-center justify-center h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Base Pay', value: stats.gross - stats.addons },
                                                { name: 'Add-ons', value: stats.addons }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            <Cell fill="#0f767e" />
                                            <Cell fill="#d97706" />
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="px-6 pb-6 flex justify-center gap-4 text-xs font-bold">
                                <div className="flex items-center gap-2 text-slate-600"><div className="w-3 h-3 rounded-full bg-[#0f767e]"></div>Base Pay</div>
                                <div className="flex items-center gap-2 text-slate-600"><div className="w-3 h-3 rounded-full bg-[#d97706]"></div>Add-ons</div>
                            </div>
                        </div>
                    )}

                    {/* Anomaly Watchlist */}
                    {results.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Eye size={16} className="text-rose-500" /> Anomaly Watchlist
                            </div>
                            <div className="p-0">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400">
                                        <tr>
                                            <th className="px-4 py-2 font-bold">Employee</th>
                                            <th className="px-4 py-2 font-bold text-right">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results.filter(r => r.totalHrs > 45 || r.totalTips > 500).sort((a,b) => b.totalHrs - a.totalHrs).slice(0, 5).map(r => (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-800">{r.nickname}</div>
                                                    <div className="text-[10px] text-slate-500">{r.totalHrs > 45 ? `${r.totalHrs} hrs` : formatCurrency(r.totalTips)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${r.totalHrs > 45 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {r.totalHrs > 45 ? 'High Hours' : 'High Add-ons'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {results.filter(r => r.totalHrs > 45 || r.totalTips > 500).length === 0 && (
                                            <tr>
                                                <td colSpan={2} className="px-4 py-8 text-center text-slate-400 font-medium text-sm">
                                                    No anomalies detected.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

function Card({ title, value, icon: Icon, color, comp }: { title: string, value: string, icon: LucideIcon, color: string, comp?: any }) {
    const bgColor = {
        lime: 'bg-lime-50 text-lime-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        teal: 'bg-teal-50 text-teal-600',
    }[color] || 'bg-slate-50 text-slate-600';
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</div>
                <div className="text-3xl font-black text-slate-900 flex items-center gap-2">
                    {value}
                    {comp && (
                        <span className={cn("text-sm font-bold px-2 py-0.5 rounded ml-2", comp.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                            {comp.isUp ? '↑' : '↓'} {Math.abs(comp.percent).toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", bgColor)}>
                <Icon size={28} />
            </div>
        </div>
    );
}
