import re

with open("src/components/Dashboard.tsx", "r") as f:
    content = f.read()

# Add new lucide icons
content = content.replace("from 'lucide-react';", ", Download, UserPlus, PlayCircle, Lock, Unlock, CalendarDays, UserMinus, ChevronRight, Activity, Calculator, Eye, AlertCircle } from 'lucide-react';")

# Add new recharts components
content = content.replace("from 'recharts';", ", PieChart, Pie, Cell } from 'recharts';")

# Update Dashboard signature
old_sig = "export default function Dashboard({ stats, results, pastMetrics, dbStatus = 'checking', isLoadingEmployees }: { stats: any, results: PayrollResult[], pastMetrics?: any, dbStatus?: 'stable' | 'disconnected' | 'checking', isLoadingEmployees?: boolean }) {"
new_sig = "export default function Dashboard({ stats, results, pastMetrics, dbStatus = 'checking', isLoadingEmployees, setActiveTab, employees = [], timesheets = {}, isLocked = false, settings }: { stats: any, results: PayrollResult[], pastMetrics?: any, dbStatus?: 'stable' | 'disconnected' | 'checking', isLoadingEmployees?: boolean, setActiveTab?: any, employees?: any[], timesheets?: any, isLocked?: boolean, settings?: any }) {"
content = content.replace(old_sig, new_sig)

# We need to replace the return block starting from `return (\n        <div className="space-y-6" data-tour="step-1">`
# to the end of the Dashboard component (before `function Card`).
# Let's find it.

split_str = '        <div className="space-y-6" data-tour="step-1">'
parts = content.split(split_str)
header_part = parts[0]
footer_part = parts[1].split('function Card')[1]

new_render = """        <div className="space-y-6" data-tour="step-1">
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

function Card"""

final_content = header_part + new_render + "function Card" + footer_part

with open("src/components/Dashboard.tsx", "w") as f:
    f.write(final_content)
