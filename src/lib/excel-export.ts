import * as XLSX from 'xlsx';
import { PayrollResult, SystemSettings, ValidationLog } from '../types';
import { format } from 'date-fns';

interface ExcelPayrollRow {
    'Employee Name': string;
    'SIN': string;
    'Total Hours': number;
    'Total Addons/Tips ($)': number;
    'Variable Bonus ($)': number;
    'Gross Earnings ($)': number;
    'Carry Forward Debt ($)': number;
}

export const exportPayrollToExcel = (results: PayrollResult[], settings: SystemSettings, auditLogs: ValidationLog[] = []) => {
    if (!results || results.length === 0) return;

    // Map raw data to strictly typed Excel rows
    const exportData: ExcelPayrollRow[] = results.map(r => ({
        'Employee Name': r.taxName || r.nickname,
        'SIN': r.sin || 'N/A',
        'Total Hours': Number(r.totalHrs.toFixed(2)),
        'Total Addons/Tips ($)': Number(r.standardAddOns.toFixed(2)),
        'Variable Bonus ($)': Number((r.variableBonus || 0).toFixed(2)),
        'Gross Earnings ($)': Number(r.grossEarnings.toFixed(2)),
        'Carry Forward Debt ($)': Number((r.carryForwardBalance || 0).toFixed(2))
    }));

    // Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns for better usability
    const colWidths = [
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 25 }
    ];
    worksheet['!cols'] = colWidths;

    // Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Report');

    // Create Audit Trail Worksheet
    if (auditLogs && auditLogs.length > 0) {
        const auditData = auditLogs.map(log => ({
            'Employee ID': log.emp_id,
            'Date': log.log_date,
            'Action': log.action_type || 'Validation',
            'Validated By': log.profiles?.email || log.validated_by,
            'Timestamp': new Date(log.validated_at).toLocaleString(),
            'Original Value': log.original_value,
            'Modified Value': log.modified_value,
            'Notes': log.notes || ''
        }));
        
        const auditSheet = XLSX.utils.json_to_sheet(auditData);
        auditSheet['!cols'] = [
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(workbook, auditSheet, 'Audit Trail');
    }

    // Generate File Name
    const safeCompanyName = (settings.companyName || 'Company').replace(/\s+/g, '_');
    const fileName = `${safeCompanyName}_Payroll_${settings.periodStart}_to_${settings.periodEnd}.xlsx`;

    // Export
    XLSX.writeFile(workbook, fileName);
};
