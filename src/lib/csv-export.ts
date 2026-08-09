import { PayrollResult, SystemSettings, ValidationLog } from '../types';

export const exportPayrollToCSV = (results: PayrollResult[], settings: SystemSettings, auditLogs: ValidationLog[] = []) => {
    if (!results || results.length === 0) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM

    // Payroll Results Headers
    csvContent += 'Employee Name,SIN,Total Hours,Total Addons/Tips ($),Variable Bonus ($),Gross Earnings ($),Carry Forward Debt ($)\n';

    // Payroll Results Data
    results.forEach(r => {
        const name = `"${(r.taxName || r.nickname || '').replace(/"/g, '""')}"`;
        const sin = `"${(r.sin || 'N/A').replace(/"/g, '""')}"`;
        const hrs = r.totalHrs.toFixed(2);
        const addons = r.standardAddOns.toFixed(2);
        const bonus = (r.variableBonus || 0).toFixed(2);
        const gross = r.grossEarnings.toFixed(2);
        const debt = (r.carryForwardBalance || 0).toFixed(2);
        
        csvContent += `${name},${sin},${hrs},${addons},${bonus},${gross},${debt}\n`;
    });

    if (auditLogs && auditLogs.length > 0) {
        csvContent += '\n\n';
        csvContent += '--- AUDIT TRAIL ---\n';
        csvContent += 'Employee ID,Date,Action,Validated By,Timestamp,Original Value,Modified Value,Notes\n';
        
        auditLogs.forEach(log => {
            const empId = `"${String(log.emp_id || '').replace(/"/g, '""')}"`;
            const date = `"${String(log.log_date || '').replace(/"/g, '""')}"`;
            const action = `"${String(log.action_type || 'Validation').replace(/"/g, '""')}"`;
            const validatedBy = `"${String(log.profiles?.email || log.validated_by || '').replace(/"/g, '""')}"`;
            const timestamp = `"${new Date(log.validated_at).toLocaleString().replace(/"/g, '""')}"`;
            const originalValue = `"${String(log.original_value || '').replace(/"/g, '""')}"`;
            const modifiedValue = `"${String(log.modified_value || '').replace(/"/g, '""')}"`;
            const notes = `"${String(log.notes || '').replace(/"/g, '""')}"`;
            
            csvContent += `${empId},${date},${action},${validatedBy},${timestamp},${originalValue},${modifiedValue},${notes}\n`;
        });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `Lime_Payroll_${settings.periodStart}_to_${settings.periodEnd}.csv`;

    // Download the file
    if ((navigator as any).msSaveBlob) {
        // IE 10+
        (navigator as any).msSaveBlob(blob, fileName);
    } else {
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};
