import { Employee, Timesheet, PayrollResult } from '../types';
import { calculatePayroll } from './payroll-engine';

export const exportJSON = (employees: Employee[], timesheets: Record<number, Timesheet>, settings: any, payrollData: PayrollResult[]) => {
    const data = { employees, timesheets, settings, payrollData, exportDate: new Date().toISOString() };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `LimePayroll_${settings.periodStart}_to_${settings.periodEnd}.json`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const importJSON = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target?.result as string);
                if (importedData.employees && importedData.timesheets && importedData.settings) {
                    let oldPayroll = importedData.payrollData;
                    if (!oldPayroll) {
                        oldPayroll = calculatePayroll(importedData.employees, importedData.timesheets);
                        importedData.payrollData = oldPayroll;
                    }
                    
                    const startVal = importedData.settings.periodStart || '2026-03-30';
                    const startD = new Date(startVal + 'T12:00:00Z');
                    startD.setDate(startD.getDate() + 14);
                    const nextStart = startD.toISOString().split('T')[0];

                    const endValD = new Date((importedData.settings.periodEnd || '2026-04-12') + 'T12:00:00Z');
                    endValD.setDate(endValD.getDate() + 14);
                    const nextEnd = endValD.toISOString().split('T')[0];
                    
                    const newSettings = {
                        ...importedData.settings,
                        periodStart: nextStart,
                        periodEnd: nextEnd,
                        isEditing: false
                    };

                    const newTimesheets: Record<number, Timesheet> = {};
                    oldPayroll.forEach((d: PayrollResult) => {
                        if (d.carryForwardBalance > 0) {
                            newTimesheets[d.id] = {
                                w1H: '', w1C: '', w1K: '', w2H: '', w2C: '', w2K: '',
                                prevDebt: parseFloat(d.carryForwardBalance.toFixed(2))
                            };
                        }
                    });

                    resolve({
                        pastData: importedData,
                        employees: importedData.employees,
                        settings: newSettings,
                        newTimesheets,
                        startVal,
                        nextStart
                    });
                } else {
                    reject(new Error('Invalid LIME Payroll JSON format.'));
                }
            } catch (error) {
                reject(new Error('Error reading file. Please select a valid exported .json file.'));
            }
        };
        reader.readAsText(file);
    });
};
