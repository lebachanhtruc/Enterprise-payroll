import re

with open("src/components/Dashboard.tsx", "r") as f:
    content = f.read()

# 1. Add ChevronDown, ChevronUp to imports if not present, and useState if not present
if "useState" not in content:
    content = content.replace("import React from 'react';", "import React, { useState } from 'react';")
if "ChevronDown" not in content:
    content = content.replace("import { DollarSign", "import { ChevronDown, ChevronUp, DollarSign")

# 2. Add isAnomalyExpanded to Dashboard
if "const [isAnomalyExpanded" not in content:
    sig = "export default function Dashboard("
    idx = content.find(sig)
    block_start = content.find("{", idx) + 1
    content = content[:block_start] + "\n    const [isAnomalyExpanded, setIsAnomalyExpanded] = useState(true);" + content[block_start:]

# 3. Calculate avgHrs and avgAddons
if "const avgHrs" not in content:
    avg_calc = """
    const avgHrs = results.length ? results.reduce((acc, r) => acc + r.totalHrs, 0) / results.length : 0;
    const avgAddons = results.length ? results.reduce((acc, r) => acc + r.totalTips, 0) / results.length : 0;
    const anomalies = results.map(r => {
        let isHighHrs = r.totalHrs > (avgHrs * 1.5) && r.totalHrs > 40;
        let isHighAddons = r.totalTips > (avgAddons * 2) && r.totalTips > 200;
        return { ...r, isHighHrs, isHighAddons };
    }).filter(r => r.isHighHrs || r.isHighAddons).sort((a,b) => b.totalHrs - a.totalHrs).slice(0, 5);
"""
    # Insert it after avgGross
    content = content.replace("const avgGross = results.length ? results.reduce((acc, r) => acc + r.grossEarnings, 0) / results.length : 0;", 
                              "const avgGross = results.length ? results.reduce((acc, r) => acc + r.grossEarnings, 0) / results.length : 0;" + avg_calc)

# 4. Update Quick Actions to fully disable with opacity
btn_process = """<button onClick={() => !isLocked && setActiveTab && setActiveTab('input')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>"""
btn_process_new = """<button onClick={() => !isLocked && setActiveTab && setActiveTab('input')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>"""
content = content.replace(btn_process, btn_process_new)

btn_confirm = """<button onClick={() => !isLocked && setActiveTab && setActiveTab('reports')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>"""
btn_confirm_new = """<button onClick={() => !isLocked && setActiveTab && setActiveTab('reports')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>"""
content = content.replace(btn_confirm, btn_confirm_new)

btn_staff = """<button onClick={() => !isLocked && setActiveTab && setActiveTab('employees')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>"""
btn_staff_new = """<button onClick={() => !isLocked && setActiveTab && setActiveTab('employees')} disabled={isLocked} className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>"""
content = content.replace(btn_staff, btn_staff_new)

# 5. Update Anomaly Watchlist block
anomaly_start_idx = content.find("{/* Anomaly Watchlist */}")
anomaly_end_idx = content.find("</div>", content.find("</table>", anomaly_start_idx)) + 6
old_anomaly_block = content[anomaly_start_idx:anomaly_end_idx]

new_anomaly_block = """{/* Anomaly Watchlist */}
                    {results.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <button onClick={() => setIsAnomalyExpanded(!isAnomalyExpanded)} className="w-full bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-800 text-sm flex items-center justify-between hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2"><Eye size={16} className="text-rose-500" /> Anomaly Watchlist</div>
                                {isAnomalyExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </button>
                            {isAnomalyExpanded && (
                                <div className="p-0">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400">
                                            <tr>
                                                <th className="px-4 py-1.5 font-bold">Employee</th>
                                                <th className="px-4 py-1.5 font-bold text-right">Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {anomalies.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2">
                                                        <div className="font-bold text-slate-800">{r.nickname}</div>
                                                        <div className="text-[10px] text-slate-500">{r.isHighHrs ? `${r.totalHrs} hrs` : formatCurrency(r.totalTips)}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.isHighHrs ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                            {r.isHighHrs ? 'High Hours' : 'High Add-ons'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {anomalies.length === 0 && (
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-6 text-center text-slate-400 font-medium text-sm">
                                                        No anomalies detected.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}"""
content = content.replace(old_anomaly_block, new_anomaly_block)

with open("src/components/Dashboard.tsx", "w") as f:
    f.write(content)
