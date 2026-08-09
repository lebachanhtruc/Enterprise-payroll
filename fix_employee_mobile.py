import re

with open("src/components/EmployeeList.tsx", "r") as f:
    content = f.read()

old_table = """                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto hide-scrollbar">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Rule Type</th>
                                    <th className="px-4 py-3">Rates</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedEmployees.map((emp: Employee) => {
                                    let ruleDetail = '';
                                    if (emp.rule.type === 'STANDARD_MAX') ruleDetail = `Max ${emp.rule.maxHrs || 0}h/w`;
                                    else if (emp.rule.type === 'GUARANTEED_MIN_HOURS') ruleDetail = `Min ${emp.rule.guaranteedBaseHrs || 0}h/w`;
                                    else if (emp.rule.type === 'FIXED_TOTAL') ruleDetail = `${emp.rule.fixedHrs || 0}h & $${emp.rule.fixedTip || 0}`;
                                    else if (emp.rule.type === 'CHECK_PLUS_CASH') ruleDetail = `${emp.rule.fixedCheckHrs || 0}h & $${emp.rule.fixedCheckTip || 0}`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_OUT_FLAT') ruleDetail = `Transfer ${emp.rule.hrsToGive || 0}h`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_IN_FLAT') {
                                        const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                                        ruleDetail = parent ? `From ${parent.nickname}` : 'From partner';
                                    }
                                    else if (emp.rule.type === 'COST_ALLOCATION_OUT_PERCENT') ruleDetail = `Keep ${emp.rule.maxOwnHrs || 0}h`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_IN_PERCENT') {
                                        const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                                        ruleDetail = parent ? `${emp.rule.hrsPercent || 0}% from ${parent.nickname}` : `${emp.rule.hrsPercent || 0}%`;
                                    }
                                    else if (emp.rule.type === 'NON_PAYROLL_CONTRACTOR') ruleDetail = `Direct Pay`;
                                    else if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') {
                                        const cr = customRules.find(r => r.id === emp.rule.customRuleId);
                                        ruleDetail = cr ? `Lib: ${cr.name}` : 'Library Rule';
                                    }

                                    let ruleTypeTitle = RULE_TYPES.find(r => r.id === emp.rule.type)?.title;
                                    if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') ruleTypeTitle = 'Custom Rule';

                                    return (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => openModal(emp)}>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                        {emp.nickname.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{emp.nickname}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">{emp.taxName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border border-indigo-100">
                                                        {ruleTypeTitle || emp.rule.type.replace(/_/g, ' ')}
                                                    </span>
                                                    {ruleDetail && <span className="text-[10px] text-slate-500 font-medium">{ruleDetail}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                        C: <strong className="font-bold">${emp.customRate}</strong>
                                                    </span>
                                                    <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                        S: <strong className="font-bold">${emp.standardRate}</strong>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-400 group-hover:bg-slate-200 group-hover:text-indigo-600 transition-colors">
                                                    {!canEdit ? <Eye size={16} /> : <Edit size={16} />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>"""

new_table = """                <>
                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto hide-scrollbar">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Rule Type</th>
                                    <th className="px-4 py-3">Rates</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedEmployees.map((emp: Employee) => {
                                    let ruleDetail = '';
                                    if (emp.rule.type === 'STANDARD_MAX') ruleDetail = `Max ${emp.rule.maxHrs || 0}h/w`;
                                    else if (emp.rule.type === 'GUARANTEED_MIN_HOURS') ruleDetail = `Min ${emp.rule.guaranteedBaseHrs || 0}h/w`;
                                    else if (emp.rule.type === 'FIXED_TOTAL') ruleDetail = `${emp.rule.fixedHrs || 0}h & $${emp.rule.fixedTip || 0}`;
                                    else if (emp.rule.type === 'CHECK_PLUS_CASH') ruleDetail = `${emp.rule.fixedCheckHrs || 0}h & $${emp.rule.fixedCheckTip || 0}`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_OUT_FLAT') ruleDetail = `Transfer ${emp.rule.hrsToGive || 0}h`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_IN_FLAT') {
                                        const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                                        ruleDetail = parent ? `From ${parent.nickname}` : 'From partner';
                                    }
                                    else if (emp.rule.type === 'COST_ALLOCATION_OUT_PERCENT') ruleDetail = `Keep ${emp.rule.maxOwnHrs || 0}h`;
                                    else if (emp.rule.type === 'COST_ALLOCATION_IN_PERCENT') {
                                        const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                                        ruleDetail = parent ? `${emp.rule.hrsPercent || 0}% from ${parent.nickname}` : `${emp.rule.hrsPercent || 0}%`;
                                    }
                                    else if (emp.rule.type === 'NON_PAYROLL_CONTRACTOR') ruleDetail = `Direct Pay`;
                                    else if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') {
                                        const cr = customRules.find(r => r.id === emp.rule.customRuleId);
                                        ruleDetail = cr ? `Lib: ${cr.name}` : 'Library Rule';
                                    }

                                    let ruleTypeTitle = RULE_TYPES.find(r => r.id === emp.rule.type)?.title;
                                    if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') ruleTypeTitle = 'Custom Rule';

                                    return (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => openModal(emp)}>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                        {emp.nickname.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{emp.nickname}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">{emp.taxName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border border-indigo-100">
                                                        {ruleTypeTitle || emp.rule.type.replace(/_/g, ' ')}
                                                    </span>
                                                    {ruleDetail && <span className="text-[10px] text-slate-500 font-medium">{ruleDetail}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                        C: <strong className="font-bold">${emp.customRate}</strong>
                                                    </span>
                                                    <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                        S: <strong className="font-bold">${emp.standardRate}</strong>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-400 group-hover:bg-slate-200 group-hover:text-indigo-600 transition-colors">
                                                    {!canEdit ? <Eye size={16} /> : <Edit size={16} />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="block md:hidden flex flex-col gap-3">
                    {paginatedEmployees.map((emp: Employee) => {
                        let ruleDetail = '';
                        if (emp.rule.type === 'STANDARD_MAX') ruleDetail = `Max ${emp.rule.maxHrs || 0}h/w`;
                        else if (emp.rule.type === 'GUARANTEED_MIN_HOURS') ruleDetail = `Min ${emp.rule.guaranteedBaseHrs || 0}h/w`;
                        else if (emp.rule.type === 'FIXED_TOTAL') ruleDetail = `${emp.rule.fixedHrs || 0}h & $${emp.rule.fixedTip || 0}`;
                        else if (emp.rule.type === 'CHECK_PLUS_CASH') ruleDetail = `${emp.rule.fixedCheckHrs || 0}h & $${emp.rule.fixedCheckTip || 0}`;
                        else if (emp.rule.type === 'COST_ALLOCATION_OUT_FLAT') ruleDetail = `Transfer ${emp.rule.hrsToGive || 0}h`;
                        else if (emp.rule.type === 'COST_ALLOCATION_IN_FLAT') {
                            const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                            ruleDetail = parent ? `From ${parent.nickname}` : 'From partner';
                        }
                        else if (emp.rule.type === 'COST_ALLOCATION_OUT_PERCENT') ruleDetail = `Keep ${emp.rule.maxOwnHrs || 0}h`;
                        else if (emp.rule.type === 'COST_ALLOCATION_IN_PERCENT') {
                            const parent = employees.find((e: Employee) => e.id === Number(emp.rule.parentId || emp.rule.linkedId));
                            ruleDetail = parent ? `${emp.rule.hrsPercent || 0}% from ${parent.nickname}` : `${emp.rule.hrsPercent || 0}%`;
                        }
                        else if (emp.rule.type === 'NON_PAYROLL_CONTRACTOR') ruleDetail = `Direct Pay`;
                        else if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') {
                            const cr = customRules.find(r => r.id === emp.rule.customRuleId);
                            ruleDetail = cr ? `Lib: ${cr.name}` : 'Library Rule';
                        }

                        let ruleTypeTitle = RULE_TYPES.find(r => r.id === emp.rule.type)?.title;
                        if (emp.rule.type === 'CUSTOM_LIBRARY_RULE') ruleTypeTitle = 'Custom Rule';

                        return (
                            <div key={emp.id} onClick={() => openModal(emp)} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                            {emp.nickname.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-base">{emp.nickname}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{emp.taxName}</div>
                                        </div>
                                    </div>
                                    <div className="text-slate-400">
                                        {!canEdit ? <Eye size={18} /> : <Edit size={18} />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rule Type</span>
                                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border border-indigo-100">
                                            {ruleTypeTitle || emp.rule.type.replace(/_/g, ' ')}
                                        </span>
                                        {ruleDetail && <span className="text-[10px] text-slate-500 font-medium">{ruleDetail}</span>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rates</span>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px] font-mono w-fit">
                                                C: <strong className="font-bold">${emp.customRate}</strong>
                                            </span>
                                            <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono w-fit">
                                                S: <strong className="font-bold">${emp.standardRate}</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                </>"""

content = content.replace(old_table, new_table)

with open("src/components/EmployeeList.tsx", "w") as f:
    f.write(content)

