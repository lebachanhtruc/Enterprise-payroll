import re

with open("src/components/TimesheetInput.tsx", "r") as f:
    content = f.read()

old_card = """                    <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-50 rounded-xl p-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase">W1 Hours</span>
                        <span className="font-mono font-bold text-slate-800">{ts.w1H || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-teal-500 uppercase">W2 Hours</span>
                        <span className="font-mono font-bold text-slate-800">{ts.w2H || '-'}</span>
                      </div>
                    </div>"""

new_card = """                    <div className="grid grid-cols-4 gap-2 mt-4 bg-slate-50 rounded-xl p-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase truncate">W1 Hrs</span>
                        <span className="font-mono font-bold text-slate-800">{ts.w1H || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-teal-500 uppercase truncate">W2 Hrs</span>
                        <span className="font-mono font-bold text-slate-800">{ts.w2H || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase truncate">Addons</span>
                        <span className="font-mono font-bold text-slate-800">
                           {((parseFloat(ts.w1C) || 0) + (parseFloat(ts.w1K) || 0) + (parseFloat(ts.w2C) || 0) + (parseFloat(ts.w2K) || 0)) > 0 
                              ? ((parseFloat(ts.w1C) || 0) + (parseFloat(ts.w1K) || 0) + (parseFloat(ts.w2C) || 0) + (parseFloat(ts.w2K) || 0)).toString() 
                              : '-'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-rose-500 uppercase truncate">Debt</span>
                        <span className="font-mono font-bold text-slate-800">{ts.prevDebt || '-'}</span>
                      </div>
                    </div>"""

content = content.replace(old_card, new_card)

with open("src/components/TimesheetInput.tsx", "w") as f:
    f.write(content)

