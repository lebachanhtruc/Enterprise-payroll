/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RuleType = 
    | 'STANDARD_MAX' 
    | 'GUARANTEED_MIN_HOURS' 
    | 'CHECK_PLUS_CASH' 
    | 'COST_ALLOCATION_OUT_FLAT' 
    | 'COST_ALLOCATION_IN_FLAT' 
    | 'COST_ALLOCATION_OUT_PERCENT' 
    | 'COST_ALLOCATION_IN_PERCENT' 
    | 'NON_PAYROLL_CONTRACTOR' 
    | 'FIXED_TOTAL'
    | 'AI_COPILOT'
    | 'CUSTOM_LIBRARY_RULE';

export interface Rule {
    type: RuleType;
    maxHrs?: number;
    guaranteedBaseHrs?: number;
    fixedHrs?: number;
    fixedTip?: number;
    fixedCheckHrs?: number;
    fixedCheckTip?: number;
    linkedId?: number | string;
    parentId?: number | string;
    hrsToGive?: number;
    maxOwnHrs?: number;
    hrsPercent?: number;
    tipPercent?: number;
    aiPrompt?: string;
    evaluated_hours?: string;
    evaluated_addons?: string;
    transfer_out_hours?: string;
    transfer_to_id?: string | number;
    customRuleId?: string;
}

export interface CustomRule {
    id: string;
    company_id: string;
    name: string;
    description: string;
    ai_prompt: string;
    evaluated_hours: string;
    evaluated_addons: string;
    transfer_out_hours: string;
    transfer_to_id: string | null;
}

export interface Employee {
    id: number;
    company_id?: string;
    nickname: string;
    taxName: string;
    customRate: number;
    standardRate: number;
    sin: string;
    address: string;
    rule: Rule;
    updated_at?: string;
}

export interface TimesheetEntry {
    w1H: number | string;
    w1C: number | string;
    w1K: number | string;
    w2H: number | string;
    w2C: number | string;
    w2K: number | string;
    prevDebt: number | string;
    isUnlocked?: boolean;
}

export interface POSLog {
    date: string;
    sessions: string[];
    hrs: number;
    isWeek1: boolean;
    isValidated?: boolean;
    hasAnomaly?: boolean;
}

export interface Timesheet extends TimesheetEntry {
    posLogs?: POSLog[];
    posTotalHrs?: number;
}

export interface PayrollResult extends Employee {
    totalHrs: number;
    totalTipCard: number;
    totalTipCash: number;
    totalTips: number;
    grossEarnings: number;
    prevDebt: number;
    actualEarnings2Wk: number;
    checkHrs2Wk: number;
    standardAddOns: number;
    adjustedHrs: number;
    variableBonus: number;
    carryForwardBalance: number;
    overHrsToGive: number;
    checkHrsWk: number;
    standardAddOnsWk: number;
    tipCash2Wk: number;
}

export interface Anomaly {
    name: string;
    date: string;
    session: string;
    hrs: number;
}

export interface SystemSettings {
    companyId?: string;
    companyName?: string;
    periodStart: string;
    periodEnd: string;
    isEditing?: boolean;
}

export interface Company {
    id: string;
    name: string;
    created_at?: string;
}

export interface ValidationLog {
    id: string;
    company_id: string;
    emp_id: number;
    log_date: string;
    validated_by: string;
    validated_at: string;
    original_value?: number;
    modified_value?: number;
    notes?: string;
    action_type?: string;
    profiles?: {
        email: string;
    };
}
