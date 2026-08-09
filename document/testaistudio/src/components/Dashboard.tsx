import React from 'react';
import { DollarSign, Clock, FileCheck, AlertTriangle, History, LucideIcon } from 'lucide-react';
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
  Area 
} from 'recharts';
import { PayrollResult } from '../types';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { Skeleton } from './ui/Skeleton';

export default function Dashboard({ stats, results, pastMetrics, dbStatus = 'checking', isLoadingEmployees }: { stats: any, results: PayrollResult[], pastMetrics?: any, dbStatus?: 'stable' | 'disconnected' | 'checking', isLoadingEmployees?: boolean }) {
    
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

    return (
        <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Total Payroll" value={formatCurrency(stats.gross)} icon={DollarSign} color="indigo" comp={grossComp} />
                <Card title="Total Hours" value={`${formatNumber(stats.hrs, 1)}h`} icon={Clock} color="sky" comp={hrsComp} />
                <Card title="Total Addons" value={formatCurrency(stats.addons)} icon={FileCheck} color="emerald" comp={addonsComp} />
            </div>

            <div className="space-y-8">
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

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">System Notifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.some(r => r.carryForwardBalance > 0) && (
                            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <AlertTriangle className="text-amber-600 mt-1" size={20} />
                                <div>
                                    <div className="font-bold text-amber-900">Carry-forward balance detected</div>
                                    <div className="text-sm text-amber-700">{results.filter(r => r.carryForwardBalance > 0).length} employees have not met guaranteed hours.</div>
                                </div>
                            </div>
                        )}
                        <div className={cn("flex items-start gap-4 p-4 rounded-xl border transition-colors", 
                            dbStatus === 'stable' ? "bg-emerald-50 border-emerald-200" :
                            dbStatus === 'disconnected' ? "bg-rose-50 border-rose-200" : 
                            "bg-slate-50 border-slate-200"
                        )}>
                            {dbStatus === 'stable' ? <FileCheck className="text-emerald-600 mt-1" size={20} /> :
                             dbStatus === 'disconnected' ? <AlertTriangle className="text-rose-600 mt-1" size={20} /> :
                             <History className="text-slate-600 mt-1" size={20} />}
                            <div>
                                <div className={cn("font-bold", 
                                    dbStatus === 'stable' ? "text-emerald-900" :
                                    dbStatus === 'disconnected' ? "text-rose-900" :
                                    "text-slate-900"
                                )}>
                                    {dbStatus === 'stable' ? 'Database is stable' : 
                                     dbStatus === 'disconnected' ? 'Database Disconnected' : 
                                     'Checking Database...'}
                                </div>
                                <div className={cn("text-sm", 
                                    dbStatus === 'stable' ? "text-emerald-700" :
                                    dbStatus === 'disconnected' ? "text-rose-700" :
                                    "text-slate-600"
                                )}>
                                    {dbStatus === 'stable' ? 'System is operating normally.' : 
                                     dbStatus === 'disconnected' ? 'Disconnected database. Cannot save online.' :
                                     'Verifying connection status.'}
                                </div>
                            </div>
                        </div>
                    </div>
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
