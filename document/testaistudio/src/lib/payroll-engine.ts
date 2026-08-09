import { Employee, PayrollResult, Timesheet } from '../types';
import { evaluate } from 'mathjs';

function safeEvaluate(
    formula: string,
    context: {
        totalHrs: number;
        totalTips: number;
        totalTipCard: number;
        totalTipCash: number;
        standardRate: number;
        customRate: number;
    }
): number {
    if (!formula) return 0;
    
    try {
        const result = evaluate(formula, { ...context, Math });
        if (typeof result === 'number') {
            return !isNaN(result) ? result : 0;
        } else if (result && typeof result === 'object' && typeof (result as any).toNumber === 'function') {
            const val = (result as any).toNumber();
            return typeof val === 'number' && !isNaN(val) ? val : 0;
        }
        const numericVal = Number(result);
        return typeof numericVal === 'number' && !isNaN(numericVal) ? numericVal : 0;
    } catch (e) {
        console.warn("safeEvaluate failed for formula:", formula, e);
        return 0;
    }
}

export function calculatePayroll(
    employees: Employee[],
    timesheets: Record<number, Timesheet>
): PayrollResult[] {
    const results: Record<number, any> = {};

    // First pass: Calculate individual earnings and preparation for allocations
    employees.forEach((emp) => {
        const ts = timesheets[emp.id] || { w1H: 0, w2H: 0, w1C: 0, w2C: 0, w1K: 0, w2K: 0, prevDebt: 0 } as Timesheet;
        const isFixed = emp.rule.type === 'FIXED_TOTAL';
        const isUnlocked = !!ts.isUnlocked;
        const isLockedFixed = isFixed && !isUnlocked;

        let w1H = isLockedFixed ? (Number(emp.rule.fixedHrs) || 0) : (Number(ts.w1H) || 0);
        let w2H = isLockedFixed ? (Number(emp.rule.fixedHrs) || 0) : (Number(ts.w2H) || 0);
        
        if (emp.rule.type === 'GUARANTEED_MIN_HOURS') {
            const minHrs = Number(emp.rule.guaranteedBaseHrs) || 0;
            w1H = Math.max(w1H, minHrs);
            w2H = Math.max(w2H, minHrs);
        }
        const w1C = isLockedFixed ? 0 : (Number(ts.w1C) || 0);
        const w2C = isLockedFixed ? 0 : (Number(ts.w2C) || 0);
        const w1K = isLockedFixed ? (Number(emp.rule.fixedTip) || 0) : (Number(ts.w1K) || 0);
        const w2K = isLockedFixed ? (Number(emp.rule.fixedTip) || 0) : (Number(ts.w2K) || 0);
        
        const prevDebt = Number(ts.prevDebt) || 0;

        const totalHrs = w1H + w2H;
        const totalTipCard = w1K + w2K;
        let totalTipCash = w1C + w2C;
        const totalTips = totalTipCard + totalTipCash;
        
        let grossEarnings = (totalHrs * (Number(emp.customRate) || Number(emp.standardRate) || 0)) + totalTips;
        let actualEarnings2Wk = Math.max(0, grossEarnings - prevDebt); 
        
        let checkHrs2Wk = 0; 
        let standardAddOns = 0; 
        let adjustedHrs = 0; 
        let variableBonus = 0;
        let carryForwardBalance = 0;
        let overHrsToGive = 0;
        
        const rule = emp.rule;
        switch(rule.type) {
            case 'FIXED_TOTAL':
                checkHrs2Wk = totalHrs;
                standardAddOns = totalTipCard; 
                variableBonus = Math.max(0, totalTipCash - prevDebt);
                grossEarnings = (totalHrs * (Number(emp.standardRate) || Number(emp.customRate) || 0)) + totalTips;
                actualEarnings2Wk = Math.max(0, grossEarnings - prevDebt);
                break;
                
            case 'NON_PAYROLL_CONTRACTOR':
                checkHrs2Wk = 0;
                standardAddOns = 0; 
                adjustedHrs = totalHrs;
                variableBonus = (totalHrs * (Number(emp.standardRate) || Number(emp.customRate) || 0)) + (totalTips * 0.8) - prevDebt;
                grossEarnings = (totalHrs * (Number(emp.standardRate) || Number(emp.customRate) || 0)) + totalTips;
                totalTipCash = 0; 
                break;
                
            case 'STANDARD_MAX':
                {
                    const max2Wk = (rule.maxHrs || 40) * 2;
                    checkHrs2Wk = Math.min(totalHrs, max2Wk);
                    const overHrs = Math.max(0, totalHrs - max2Wk);
                    standardAddOns = totalTipCard + (overHrs * (Number(emp.standardRate) || 0)) - prevDebt; 
                }
                break;
                
            case 'GUARANTEED_MIN_HOURS':
                {
                    const targetHrs2Wk = (rule.guaranteedBaseHrs || 40) * 2;
                    checkHrs2Wk = targetHrs2Wk; 
                    const paperSalary = targetHrs2Wk * (Number(emp.standardRate) || 0);
                    
                    if (actualEarnings2Wk < paperSalary) {
                        standardAddOns = 0;
                        carryForwardBalance = paperSalary - actualEarnings2Wk; 
                    } else {
                        standardAddOns = actualEarnings2Wk - paperSalary;
                        carryForwardBalance = 0;
                    }
                    totalTipCash = 0; 
                }
                break;
                
            case 'CHECK_PLUS_CASH':
                {
                    const targetCheckHrs = (rule.fixedCheckHrs || 0) * 2;
                    const targetCheckTip = (rule.fixedCheckTip || 0) * 2;
                    
                    checkHrs2Wk = Math.min(totalHrs, targetCheckHrs);
                    
                    let baseCheckTip = Math.min(totalTips, targetCheckTip);
                    let tipShortfall = targetCheckTip - baseCheckTip;
                    
                    let excessHrs = Math.max(0, totalHrs - targetCheckHrs);
                    let excessHrsMoney = excessHrs * (Number(emp.customRate) || Number(emp.standardRate) || 0);
                    
                    let convertToTip = Math.min(tipShortfall, excessHrsMoney);
                    standardAddOns = baseCheckTip + convertToTip;
                    
                    let remainingHrsMoney = excessHrsMoney - convertToTip;
                    let excessTipsMoney = Math.max(0, totalTips - targetCheckTip) * 0.8;
                    
                    variableBonus = Math.max(0, remainingHrsMoney + excessTipsMoney - prevDebt);
                    adjustedHrs = remainingHrsMoney / (Number(emp.customRate) || 1); 
                    
                    totalTipCash = 0; 
                }
                break;
                
            case 'COST_ALLOCATION_OUT_FLAT':
                {
                    const hrsToGive2Wk = (rule.hrsToGive || 0) * 2;
                    checkHrs2Wk = Math.max(0, totalHrs - hrsToGive2Wk);
                    standardAddOns = Math.max(0, totalTipCard - prevDebt); 
                    overHrsToGive = Math.min(totalHrs, hrsToGive2Wk);
                }
                break;

            case 'COST_ALLOCATION_OUT_PERCENT':
                {
                    const maxOwn2Wk = (rule.maxOwnHrs || 0) * 2;
                    checkHrs2Wk = Math.min(totalHrs, maxOwn2Wk);
                    standardAddOns = Math.max(0, totalTipCard - prevDebt); 
                    overHrsToGive = Math.max(0, totalHrs - maxOwn2Wk);
                }
                break;

            case 'AI_COPILOT':
            case 'CUSTOM_LIBRARY_RULE':
                {
                    const context = {
                        totalHrs,
                        totalTips,
                        totalTipCard,
                        totalTipCash,
                        standardRate: Number(emp.standardRate) || 0,
                        customRate: Number(emp.customRate) || 0
                    };
                    checkHrs2Wk = safeEvaluate(rule.evaluated_hours || '', context);
                    standardAddOns = safeEvaluate(rule.evaluated_addons || '', context);
                    overHrsToGive = safeEvaluate(rule.transfer_out_hours || '', context);
                }
                break;
        }
        
        // Cap for standard cycle (max 80 hours)
        if (checkHrs2Wk > 80) {
            const excessCheckHrs = checkHrs2Wk - 80;
            const excessMoney = excessCheckHrs * (Number(emp.standardRate) || 0); 
            checkHrs2Wk = 80;
            standardAddOns += excessMoney; 
        }

        if (standardAddOns < 0) standardAddOns = 0;

        results[emp.id] = { 
            ...emp, totalHrs, totalTipCard, totalTipCash, totalTips, grossEarnings, prevDebt, actualEarnings2Wk,
            checkHrs2Wk, standardAddOns, adjustedHrs, variableBonus, carryForwardBalance, overHrsToGive
        };
    });

    // Second pass: Process receivers of cost allocations and AI transfers
    employees.forEach((emp) => {
        const rule = emp.rule;
        
        // Check for dynamic AI rule hours transferred to this employee
        let aiHrsReceived = 0;
        employees.forEach((otherEmp) => {
            const otherData = results[otherEmp.id];
            if ((otherEmp.rule.type === 'AI_COPILOT' || otherEmp.rule.type === 'CUSTOM_LIBRARY_RULE') && otherData) {
                const targetId = Number(otherEmp.rule.transfer_to_id);
                if (targetId === emp.id) {
                    aiHrsReceived += (otherData.overHrsToGive || 0);
                }
            }
        });

        if (rule.type === 'COST_ALLOCATION_IN_FLAT' || rule.type === 'COST_ALLOCATION_IN_PERCENT' || aiHrsReceived > 0) {
            const parentId = Number(rule.parentId);
            const parentData = results[parentId];
            let hrsReceived = (parentData ? parentData.overHrsToGive : 0) + aiHrsReceived;
            
            let receiverCheckHrs = 0;
            let receiverCheckTip = 0;

            if (rule.type === 'COST_ALLOCATION_IN_FLAT' || aiHrsReceived > 0) {
                receiverCheckHrs = hrsReceived;
                receiverCheckTip = 0;
            } 
            else if (rule.type === 'COST_ALLOCATION_IN_PERCENT') {
                receiverCheckHrs = hrsReceived * ((rule.hrsPercent || 0) / 100);
                receiverCheckTip = (hrsReceived * ((rule.tipPercent || 0) / 100)) * (Number(emp.standardRate) || 0);
            }

            // Cap for standard cycle
            if (receiverCheckHrs > 80) {
                const excess = receiverCheckHrs - 80;
                receiverCheckTip += (excess * (Number(emp.standardRate) || 0));
                receiverCheckHrs = 80;
            }

            if (!results[emp.id]) {
                results[emp.id] = { ...emp };
            }

            results[emp.id].checkHrs2Wk = (results[emp.id].checkHrs2Wk || 0) + receiverCheckHrs;
            results[emp.id].standardAddOns = (results[emp.id].standardAddOns || 0) + receiverCheckTip;
            results[emp.id].grossEarnings = (results[emp.id].checkHrs2Wk * (Number(emp.standardRate) || Number(emp.customRate) || 0)) + results[emp.id].standardAddOns;
            results[emp.id].actualEarnings2Wk = results[emp.id].grossEarnings;
        }
    });

    // Final mapping and formatting
    return Object.values(results).map((d) => {
        let finalTipCash2Wk = d.totalTipCash || 0;
        if (['GUARANTEED_MIN_HOURS', 'CHECK_PLUS_CASH', 'NON_PAYROLL_CONTRACTOR'].includes(d.rule.type)) {
            finalTipCash2Wk = 0; 
        }

        return {
            ...d,
            checkHrsWk: d.checkHrs2Wk / 2,
            standardAddOnsWk: d.standardAddOns / 2,
            tipCash2Wk: finalTipCash2Wk,
            adjustedHrs: d.adjustedHrs || 0,
            variableBonus: d.variableBonus || 0,
            carryForwardBalance: d.carryForwardBalance || 0,
            actualEarnings2Wk: d.actualEarnings2Wk || 0,
            grossEarnings: d.grossEarnings || 0,
            prevDebt: d.prevDebt || 0
        };
    });
}
