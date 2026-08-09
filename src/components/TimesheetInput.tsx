import React, { useRef, useState } from 'react';
import { Lock, Unlock, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Employee, Timesheet, SystemSettings, Anomaly } from '../types';
import { processPOSFiles } from '../lib/pos-parser';
import { cn, hasSessionAnomaly } from '../lib/utils';
import { useUI } from '../contexts/UIContext';
import { Skeleton } from './ui/Skeleton';

interface TimesheetInputProps {
  employees: Employee[];
  timesheets: Record<number, Timesheet>;
  onTimeChange: (empId: number, field: string, val: string) => void;
  setTimesheets: React.Dispatch<React.SetStateAction<Record<number, Timesheet>>>;
  settings: SystemSettings;
  setAnomalies: React.Dispatch<React.SetStateAction<Anomaly[]>>;
  setShowAnomaliesModal: React.Dispatch<React.SetStateAction<boolean>>;
  setViewLogsConfig: React.Dispatch<React.SetStateAction<{ empId: number | null, filter: 'all' | 'valid' | 'anomaly' | '' } | null>>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingEmployees?: boolean;
  isLocked?: boolean;
}

export default function TimesheetInput({ employees, timesheets, onTimeChange, setTimesheets, settings, setAnomalies, setShowAnomaliesModal, setViewLogsConfig, hasUnsavedChanges, setHasUnsavedChanges, isLoadingEmployees, isLocked }: TimesheetInputProps) {
  const { showToast, showConfirm } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const timesheetEmployees = React.useMemo(() => {
    return employees.filter((e: Employee) => !e.rule.type.includes('_IN_'));
  }, [employees]);

  const filteredEmployees = React.useMemo(() => {
    return timesheetEmployees.filter((emp: Employee) => {
      const nick = (emp.nickname || '').toLowerCase();
      const tax = (emp.taxName || '').toLowerCase();
      const q = searchTerm.toLowerCase().trim();
      return nick.includes(q) || tax.includes(q);
    });
  }, [timesheetEmployees, searchTerm]);

  const paginatedEmployees = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);

  const hasValidationErrors = React.useMemo(() => {
    let errorCount = 0;
    for (const emp of timesheetEmployees) {
      const ts = timesheets[emp.id];
      if (!ts) continue;
      
      const checkField = (field: string) => {
        const val = parseFloat(ts[field]);
        if (isNaN(val)) return;
        if (val < 0) errorCount++;
        if (field.includes('H') && val > 168) errorCount++;
      };

      checkField('w1H');
      checkField('w1C');
      checkField('w1K');
      checkField('w2H');
      checkField('w2C');
      checkField('w2K');
      checkField('prevDebt');
    }
    return errorCount > 0;
  }, [timesheets, timesheetEmployees]);

  const handleSaveClick = () => {
    if (hasValidationErrors) return;
    setHasUnsavedChanges(false);
    showToast('Timesheet changes saved successfully!', 'success');
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      try {
          const { updatedTimesheets, newAnomalies, alertMsg } = await processPOSFiles(files, settings.periodStart, employees, timesheets);
          setTimesheets(updatedTimesheets);
          setHasUnsavedChanges(true);
          if (newAnomalies.length > 0) { setAnomalies(newAnomalies); setShowAnomaliesModal(true); }
          showToast(alertMsg, 'success');
      } catch (err) {
          console.warn(err);
          showToast('Error processing POS file!', 'error');
      }
      e.target.value = '';
  };

  const handleResetFormClick = async () => {
      const confirmed = await showConfirm(
          'Clear all form data?',
          'Are you sure you want to clear all worklog data (including previous debt and POS logs) for this period? This action cannot be undone.'
      );
      if (confirmed) {
          setTimesheets({});
          setHasUnsavedChanges(true);
          showToast('Timesheet data has been reset.', 'info');
      }
  };

  const toggleUnlock = (empId: number, rule: any) => {
      if (isLocked) return;
      setTimesheets((prev: any) => {
          const cTs = prev[empId] || {};
          const isU = !cTs.isUnlocked;
          if (isU) return { ...prev, [empId]: { ...cTs, isUnlocked: true, w1H: cTs.w1H || rule.fixedHrs || '', w2H: cTs.w2H || rule.fixedHrs || '', w1K: cTs.w1K || rule.fixedTip || '', w2K: cTs.w2K || rule.fixedTip || '' } };
          return { ...prev, [empId]: { ...cTs, isUnlocked: false } };
      });
      setHasUnsavedChanges(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" data-tour="step-3">
      <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Timesheet Processing</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search employee..." 
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-xl outline-none focus:border-indigo-500 bg-white shadow-sm text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input type="file" multiple accept=".csv" ref={fileInputRef} className="hidden" onChange={handleCSV} />
            
            <button 
              onClick={handleSaveClick}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap",
                isLocked 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : hasValidationErrors
                    ? "bg-rose-100 text-rose-500 border border-rose-200 cursor-not-allowed"
                    : hasUnsavedChanges 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              )}
              disabled={isLocked || !hasUnsavedChanges || hasValidationErrors}
              title={isLocked ? "Cycle locked" : hasValidationErrors ? "Fix validation errors before saving" : "Temporarily save changes to session memory"}
            >
              {hasValidationErrors ? 'Invalid Entries' : 'Save Changes'}
            </button>

            <button disabled={isLocked} onClick={() => !isLocked && fileInputRef.current?.click()} className={cn("px-4 py-2 border rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap", isLocked ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "text-white bg-indigo-600 border-indigo-600 hover:bg-indigo-700 cursor-pointer")} title="Import CSV files containing timesheet data directly from the Point of Sale system">Sync from POS</button>
            <button disabled={isLocked} onClick={handleResetFormClick} className={cn("px-4 py-2 border rounded-lg text-sm font-bold transition-colors shadow-sm whitespace-nowrap", isLocked ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "text-slate-600 bg-white border-slate-300 hover:bg-slate-50 cursor-pointer")} title="Clear all current timesheet inputs and start over">Reset Form</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full relative">
        <table className="w-full text-left min-w-[850px] table-fixed">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-3 md:px-6 py-3 md:py-4 w-28 md:w-48 sticky left-0 z-20 bg-slate-900 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.15)] align-middle" rowSpan={2}>Employee</th>
              <th className="px-4 py-2 text-center bg-indigo-800 border-l border-slate-700" colSpan={3}>Week 1</th>
              <th className="px-4 py-2 text-center bg-teal-800 border-l border-slate-700" colSpan={3}>Week 2</th>
              <th className="px-4 py-2 text-center bg-amber-700 border-l border-slate-700">Previous Debt</th>
            </tr>
            <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 bg-slate-900">
              <th className="px-2 py-2 text-center bg-indigo-900/50 border-l border-slate-800">Hours</th>
              <th className="px-2 py-2 text-center bg-indigo-900/50">Cash Addon</th>
              <th className="px-2 py-2 text-center bg-indigo-900/50">Card Addon</th>
              <th className="px-2 py-2 text-center bg-teal-900/50 border-l border-slate-800">Hours</th>
              <th className="px-2 py-2 text-center bg-teal-900/50">Cash Addon</th>
              <th className="px-2 py-2 text-center bg-teal-900/50">Card Addon</th>
              <th className="px-2 py-2 text-center bg-amber-900/50 border-l border-slate-800">Prev Debt</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingEmployees && employees.length === 0 ? (
                <>
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={`sk-${i}`} className="border-b border-slate-200 bg-white">
                        <td className="px-3 md:px-6 py-4 border-r border-slate-200 sticky left-0 z-10 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <Skeleton className="h-6 w-16 md:w-24" />
                        </td>
                        <td className="p-2 border-r border-slate-100"><Skeleton className="h-9 w-full min-w-[60px]" /></td>
                        <td className="p-2 border-r border-slate-100"><Skeleton className="h-9 w-full" /></td>
                        <td className="p-2 border-r border-slate-100"><Skeleton className="h-9 w-full" /></td>
                        <td className="p-2 border-r border-slate-100"><Skeleton className="h-9 w-full" /></td>
                        <td className="p-2 border-r border-slate-100"><Skeleton className="h-9 w-full" /></td>
                        <td className="p-2 border-r border-slate-100"><Skeleton className="h-9 w-full" /></td>
                        <td className="p-2"><Skeleton className="h-9 w-full" /></td>
                      </tr>
                    ))}
                </>
            ) : paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500 font-semibold bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center">
                    <Search size={32} className="text-slate-300 mb-2" />
                    <p>No employees found matching "{searchTerm}"</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp: Employee) => {
                const ts = timesheets[emp.id] || { w1H: '', w1C: '', w1K: '', w2H: '', w2C: '', w2K: '', prevDebt: '' };
                const isFixed = emp.rule.type === 'FIXED_TOTAL';
                const isUnlocked = !!ts.isUnlocked;
                const isLockedFixed = isFixed && !isUnlocked;
                
                const renderInput = (field: string, bg: string, lockedFixed: boolean) => {
                    let displayValue = (ts as any)[field];
                    const inputDisabled = isLocked || lockedFixed;
                    if (lockedFixed) {
                        displayValue = field.includes('C') ? '' : (field.includes('H') ? emp.rule.fixedHrs : emp.rule.fixedTip);
                    } else if (emp.rule.type === 'GUARANTEED_MIN_HOURS' && field.includes('H')) {
                        const minHrs = emp.rule.guaranteedBaseHrs || 0;
                        const actualHrs = parseFloat(displayValue);
                        if (isNaN(actualHrs) || actualHrs < minHrs) {
                            displayValue = minHrs;
                        }
                    }

                    const numericValue = parseFloat(displayValue);
                    const isHoursField = field.includes('H');
                    const hasError = !isNaN(numericValue) && (numericValue < 0 || (isHoursField && numericValue > 168));

                    return (
                        <input 
                            type="number" 
                            min="0"
                            step="0.1" 
                            disabled={inputDisabled} 
                            value={displayValue} 
                            onChange={e => onTimeChange(emp.id, field, e.target.value)} 
                            onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            className={cn(
                                "w-full min-w-[60px] p-2 border rounded outline-none text-right font-mono focus:border-indigo-500 transition-colors", 
                                bg, 
                                inputDisabled && "opacity-50 cursor-not-allowed",
                                hasError && !inputDisabled && "border-rose-500 bg-rose-50 text-rose-700 animate-pulse focus:border-rose-600"
                            )} 
                        />
                    );
                };

                return (
                  <tr key={emp.id} className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-3 md:px-6 py-3 md:py-4 border-r border-slate-200 sticky left-0 z-10 bg-white drop-shadow-md shadow-[2px_0_5px_rgba(0,0,0,0.05)] align-top">
                      <div className="font-bold text-slate-900 text-sm md:text-base truncate max-w-[80px] md:max-w-none">{emp.nickname}</div>
                      {isFixed && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 md:gap-2">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase", isUnlocked ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600')}>{isUnlocked ? 'Edit Mode' : 'Fixed'}</span>
                            <button disabled={isLocked} onClick={() => toggleUnlock(emp.id, emp.rule)} className={cn("transition-colors", isLocked ? "text-slate-300 cursor-not-allowed" : "text-slate-400 hover:text-slate-700")} title="Toggle edit lock for this employee">{isUnlocked ? <Lock size={14} /> : <Unlock size={14}/>}</button>
                          </div>
                      )}
                      {ts.posLogs && ts.posLogs.length > 0 && !isLockedFixed && (() => {
                          const validLogsCount = ts.posLogs.filter((l: any) => !hasSessionAnomaly(l.sessions, l.isValidated)).length;
                          const anomalyLogsCount = ts.posLogs.filter((l: any) => hasSessionAnomaly(l.sessions, l.isValidated)).length;
                          return (
                              <div className="flex flex-col gap-1 mt-2">
                                  {validLogsCount > 0 && (
                                      <button onClick={() => setViewLogsConfig({empId: emp.id, filter: 'valid'})} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold hover:bg-emerald-100 transition-colors" title="View valid POS time logs for this employee">Log POS ({validLogsCount})</button>
                                  )}
                                  {anomalyLogsCount > 0 && (
                                      <button onClick={() => setViewLogsConfig({empId: emp.id, filter: 'anomaly'})} className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold hover:bg-rose-100 transition-colors" title="View anomalous or flagged POS time logs requiring attention">Log POS ({anomalyLogsCount})</button>
                                  )}
                              </div>
                          );
                      })()}
                    </td>
                    <td className="p-2 border-r border-slate-100 bg-indigo-50/10">{renderInput('w1H', 'bg-white font-bold', isLockedFixed)}</td>
                    <td className="p-2 border-r border-slate-100 bg-indigo-50/10">{renderInput('w1C', 'bg-emerald-50 border-emerald-100 text-emerald-800', isLockedFixed)}</td>
                    <td className="p-2 border-r border-slate-100 bg-indigo-50/10">{renderInput('w1K', 'bg-indigo-50 border-indigo-100 text-indigo-800', isLockedFixed)}</td>
                    <td className="p-2 border-r border-slate-100 bg-teal-50/10">{renderInput('w2H', 'bg-white font-bold', isLockedFixed)}</td>
                    <td className="p-2 border-r border-slate-100 bg-teal-50/10">{renderInput('w2C', 'bg-emerald-50 border-emerald-100 text-emerald-800', isLockedFixed)}</td>
                    <td className="p-2 border-r border-slate-100 bg-teal-50/10">{renderInput('w2K', 'bg-slate-50 border-slate-200 text-slate-800', isLockedFixed)}</td>
                    <td className="p-2 bg-amber-50/20">{renderInput('prevDebt', 'bg-rose-50 border-rose-200 text-rose-700 font-bold', false)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-slate-50 px-6 py-4 border-t border-slate-100">
          <div className="text-sm text-slate-500 font-medium">
            Showing <strong className="font-bold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong className="font-bold text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)}</strong> of <strong className="font-bold text-slate-800">{filteredEmployees.length}</strong> employees
          </div>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

