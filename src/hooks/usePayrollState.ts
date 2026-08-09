import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Timesheet, Anomaly } from '../types';

export function usePayrollState(companyId: string | null, isDemoUser: boolean = false, role?: string | null, userEmail?: string | null) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<Record<number, Timesheet>>({});
  const [pastData, setPastData] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [viewLogsConfig, setViewLogsConfig] = useState<{empId: number | null, filter: 'all'|'valid'|'anomaly'|''} | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  
  const [showAnomaliesModal, setShowAnomaliesModal] = useState(false);

  const [settings, setSettings] = useState<any>({ 
    companyName: '', 
    companyId: '', 
    periodStart: '2026-07-06', 
    periodEnd: '2026-07-20', 
    isEditing: false 
  });

  // Update settings with companyId from context when it changes
  useEffect(() => {
      if (!companyId) {
          // TOTAL CACHE WIPE for orphaned users to prevent state bleeding
          setSettings({ companyName: '', companyId: '', periodStart: '', periodEnd: '', isEditing: false });
          setEmployees([]);
          setTimesheets({});
          setPastData(null);
          setAnomalies([]);
      } else {
          setSettings(prev => prev.companyId !== companyId ? { ...prev, companyId } : prev);
          
          async function fetchCompanyData() {
              if (companyId.startsWith('local_')) return;
              if (!supabase) return;
              try {
                  const { data, error } = await supabase.from('companies').select('name').eq('id', companyId).single();
                  if (!error && data) {
                      setSettings(prev => {
                          const newSettings = { ...prev, companyName: data.name.replace('Sandbox', 'Demo') };
                          if (!newSettings.periodStart) {
                              newSettings.periodStart = '2026-07-06';
                              newSettings.periodEnd = '2026-07-20';
                          }
                          return newSettings;
                      });
                  }
              } catch (err) {
                  console.error('Failed to fetch company data:', err);
              }
          }
          fetchCompanyData();
      }
  }, [companyId]);

  const prevCompanyIdRef = useRef(settings.companyId);

  useEffect(() => {
    async function fetchEmployees() {
      const isInitialMount = Object.keys(timesheets).length === 0 && !pastData && anomalies.length === 0;
      const isCompanyChanged = prevCompanyIdRef.current !== settings.companyId || isInitialMount;
      
      if (isCompanyChanged) {
        setEmployees([]);
        setTimesheets({});
        setPastData(null);
        setAnomalies([]);
        prevCompanyIdRef.current = settings.companyId;
      }

      if (!settings.companyId || settings.companyId.startsWith('local_')) {
        return;
      }
      
      if (!supabase) return;
      
      setIsLoadingEmployees(true);
      try {
        const { data, error } = await supabase.from('employees').select('*').eq('company_id', settings.companyId);
        if (error) {
          console.warn('Supabase error:', error.message);
        } else if (data) {
          let mappedData = data.map((emp: any) => ({
            ...emp,
            taxName: emp.tax_name !== undefined ? emp.tax_name : emp.taxName,
            customRate: emp.custom_rate !== undefined ? emp.custom_rate : emp.customRate,
            standardRate: emp.standard_rate !== undefined ? emp.standard_rate : emp.standardRate,
          }));

          if (role === 'STAFF') {
            const demoEmail = isDemoUser ? 'kevin@limepayroll.local' : '';
            const emailToUse = userEmail || demoEmail;
            
            if (emailToUse) {
                const prefix = emailToUse.split('@')[0].toLowerCase();
                mappedData = mappedData.filter((emp: any) => {
                  const nick = (emp.nickname || '').toLowerCase();
                  const tax = (emp.taxName || '').toLowerCase();
                  return nick.includes(prefix) || tax.includes(prefix);
                });
            }
          }

          setEmployees(mappedData);
          
          // Hydrate realistic random timesheet data for Interactive Demo
          setTimesheets(currentTs => {
            if (Object.keys(currentTs).length > 0) return currentTs;

            const newTimesheets: Record<number, any> = {};
            mappedData.forEach((emp: any) => {
                if (isDemoUser) {
                  const isFOH = ['CHECK_PLUS_CASH', 'COST_ALLOCATION_IN_FLAT', 'COST_ALLOCATION_IN_PERCENT', 'COST_ALLOCATION_OUT_FLAT', 'COST_ALLOCATION_OUT_PERCENT'].includes(emp.rule?.type);
                  
                  const w1H = (isFOH ? (Math.floor(Math.random() * 20) + 15) : (Math.floor(Math.random() * 15) + 30)) + (Math.random() > 0.5 ? 0.5 : 0);
                  const w2H = (isFOH ? (Math.floor(Math.random() * 20) + 15) : (Math.floor(Math.random() * 15) + 30)) + (Math.random() > 0.5 ? 0.5 : 0);
                  
                  const w1K = isFOH ? (Math.floor(Math.random() * 300) + 150) : (Math.floor(Math.random() * 60) + 20);
                  const w2K = isFOH ? (Math.floor(Math.random() * 300) + 150) : (Math.floor(Math.random() * 60) + 20);

                  // Generate Mock POS Logs
                  const mockPosLogs: any[] = [];
                  const validCount = Math.floor(Math.random() * 4) + 3; // 3 to 6 valid logs
                  const anomalyCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 anomalies

                  for(let i=0; i<validCount; i++) {
                      mockPosLogs.push({ date: `2026-07-0${i+1}`, sessions: ['10:00-14:00', '17:00-21:00'], hrs: 8, isWeek1: true, isValidated: false, hasAnomaly: false });
                  }
                  for(let i=0; i<anomalyCount; i++) {
                      mockPosLogs.push({ date: `2026-07-1${i+1}`, sessions: ['10:00-22:00'], hrs: 12, isWeek1: false, isValidated: false, hasAnomaly: true });
                  }

                  newTimesheets[emp.id] = { 
                      w1H, w2H, w1K, w2K, w1C: 0, w2C: 0, prevDebt: 0, 
                      posLogs: mockPosLogs, 
                      posTotalHrs: w1H + w2H 
                  };
                } else {
                  newTimesheets[emp.id] = { w1H: '', w2H: '', w1K: '', w2K: '', w1C: '', w2C: '', prevDebt: 0 };
                }
            });
            return newTimesheets;
          });
        }
      } catch (err) {
        console.error('Failed to fetch employees from Supabase:', err);
      } finally {
        setIsLoadingEmployees(false);
      }
    }
    
    fetchEmployees();
  }, [settings.companyId, role, userEmail]);

  useEffect(() => {
    async function autoFetchFromSupabase() {
      if (!settings.companyId || !settings.periodStart || settings.companyId.startsWith('local_')) return;
      
      const targetDateObj = new Date(settings.periodStart + 'T12:00:00Z');
      if (isNaN(targetDateObj.getTime())) return;
      
      const prevEnd = new Date(targetDateObj);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const targetPeriodEnd = prevEnd.toISOString().split('T')[0];
      
      try {
        const { data: logs, error: logsError } = await supabase
            .from('payroll_logs')
            .select('*')
            .eq('company_id', settings.companyId)
            .eq('period_end', targetPeriodEnd);

        if (logsError) throw logsError;

        if (!logs || logs.length === 0) {
            console.log("No records found for previous period ending " + targetPeriodEnd);
            return;
        }

        const targetPeriodStart = logs[0].period_start;

        const mappedPayrollData = logs.map(log => ({
            id: log.emp_id,
            totalHrs: log.total_hrs,
            totalTips: Number(log.standard_add_ons) + Number(log.variable_bonus),
            carryForwardBalance: log.carry_forward_balance
        }));

        const syntheticPastData = {
            employees: employees,
            timesheets: {},
            settings: {
                ...settings,
                periodStart: targetPeriodStart,
                periodEnd: targetPeriodEnd,
            },
            payrollData: mappedPayrollData
        };

        setPastData(syntheticPastData);

        setTimesheets((prev) => {
            const newTs = { ...prev };
            // Clear existing prevDebt
            Object.keys(newTs).forEach(key => {
                newTs[Number(key)] = { ...newTs[Number(key)], prevDebt: 0 };
            });
            // Set new prevDebt
            mappedPayrollData.forEach((d) => {
                if (d.carryForwardBalance > 0) {
                    if (!newTs[d.id]) {
                        newTs[d.id] = { w1H: '', w1C: '', w1K: '', w2H: '', w2C: '', w2K: '', prevDebt: 0 };
                    }
                    newTs[d.id] = { ...newTs[d.id], prevDebt: d.carryForwardBalance };
                }
            });
            return newTs;
        });
        console.log("Automatically loaded data from Supabase for previous period ending " + targetPeriodEnd);
      } catch (error) {
         console.error("Auto load from Supabase failed:", error);
      }
    }
    
    autoFetchFromSupabase();
  }, [settings.periodStart, settings.companyId]);

  // Check if current period is locked
  useEffect(() => {
    async function checkLockStatus() {
        if (!settings.companyId || !settings.periodStart || settings.companyId.startsWith('local_')) {
            setIsLocked(false);
            return;
        }
        try {
            const { count, error } = await supabase
                .from('payroll_logs')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', settings.companyId)
                .eq('period_start', settings.periodStart)
                .eq('period_end', settings.periodEnd);
            
            if (!error && count !== null && count > 0) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        } catch (e) {
            console.error('Error checking lock status', e);
        }
    }
    checkLockStatus();
  }, [settings.companyId, settings.periodStart, settings.periodEnd]);

  const calculateHrsFromSessions = (sessions: string[]) => {
      let total = 0;
      let hasAnomaly = false;
      sessions.forEach(s => {
          const parts = s.split('-');
          if (parts.length === 2) {
              const parseTime = (t: string) => {
                  const [h, m] = t.split(':').map(Number);
                  return h + (m / 60);
              };
              const start = parseTime(parts[0].trim());
              const end = parseTime(parts[1].trim());
              if (!isNaN(start) && !isNaN(end)) {
                  let diff = end - start;
                  if (diff < 0) diff += 24;
                  total += diff;
                  if (diff > 9) hasAnomaly = true;
              }
          }
      });
      return { total, hasAnomaly };
  };

  const handlePosLogEdit = (empId: number, logIdx: number, newSessions: string[]) => {
      const { total: newHrs, hasAnomaly: newHasAnomaly } = calculateHrsFromSessions(newSessions);
      if (isNaN(newHrs)) return;
      
      setTimesheets(prev => {
          const empTs = prev[empId];
          if (!empTs || !empTs.posLogs) return prev;
          
          const updatedLogs = [...empTs.posLogs];
          updatedLogs[logIdx] = { ...updatedLogs[logIdx], sessions: newSessions, hrs: newHrs, hasAnomaly: newHasAnomaly };
          
          const w1Hrs = updatedLogs.filter((l: any) => l.isWeek1).reduce((sum: number, l: any) => sum + l.hrs, 0);
          const w2Hrs = updatedLogs.filter((l: any) => !l.isWeek1).reduce((sum: number, l: any) => sum + l.hrs, 0);
          const totalHrs = w1Hrs + w2Hrs;
          
          return {
              ...prev,
              [empId]: {
                  ...empTs,
                  posLogs: updatedLogs,
                  w1H: w1Hrs > 0 ? parseFloat(w1Hrs.toFixed(2)) : '',
                  w2H: w2Hrs > 0 ? parseFloat(w2Hrs.toFixed(2)) : '',
                  posTotalHrs: totalHrs
              }
          };
      });
      
      if (newHrs <= 9) {
          setAnomalies(prevAnomalies => {
              const emp = employees.find(e => e.id === empId);
              if (!emp) return prevAnomalies;
              const logDate = timesheets[empId].posLogs![logIdx].date;
              
              const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '') : '';
              const normTax = normalize(emp.taxName);
              const normNick = normalize(emp.nickname);
              
              return prevAnomalies.filter(a => {
                  const normAno = normalize(a.name);
                  const isMatchName = normAno === normTax || normAno === normNick;
                  const isMatchDate = a.date === logDate;
                  if (isMatchName && isMatchDate) {
                      return false;
                  }
                  return true;
              });
          });
      }
      setHasUnsavedChanges(true);
  };

  const handlePosLogValidate = async (empId: number, logIdx: number) => {
      const empTs = timesheets[empId];
      if (!empTs || !empTs.posLogs) return;
      
      const log = empTs.posLogs[logIdx];

      if (supabase && settings.companyId) {
          try {
              await supabase.from('pos_validations').insert([{
                  company_id: settings.companyId,
                  emp_id: empId,
                  log_date: log.date
              }]);
          } catch (e) {
              console.error('Failed to insert POS validation audit log:', e);
          }
      }

      // Local Demo Storage Logic (Restore AI-removed parts)
      const newLog = {
          id: `demo-log-${Date.now()}`,
          company_id: settings.companyId,
          emp_id: empId,
          log_date: log.date,
          validated_by: 'Current Session (Demo)',
          validated_at: new Date().toISOString(),
          original_value: log.hrs,
          modified_value: log.hrs,
          action_type: 'Validation',
          profiles: { email: 'demo_user@limepayroll.local' }
      };
      const existingLogs = JSON.parse(sessionStorage.getItem('demo_audit_logs') || '[]');
      sessionStorage.setItem('demo_audit_logs', JSON.stringify([newLog, ...existingLogs]));

      setTimesheets(prev => {
          const currentTs = prev[empId];
          if (!currentTs || !currentTs.posLogs) return prev;
          const updatedLogs = [...currentTs.posLogs];
          updatedLogs[logIdx] = { ...updatedLogs[logIdx], isValidated: true };
          return {
              ...prev,
              [empId]: {
                  ...currentTs,
                  posLogs: updatedLogs
              }
          };
      });
      setHasUnsavedChanges(true);
  };

  return {
    employees,
    setEmployees,
    timesheets,
    setTimesheets,
    settings,
    setSettings,
    pastData,
    setPastData,
    anomalies,
    setAnomalies,
    showAnomaliesModal,
    setShowAnomaliesModal,
    viewLogsConfig,
    setViewLogsConfig,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    isLoadingEmployees,
    isLocked,
    setIsLocked,
    handlePosLogEdit,
    handlePosLogValidate,
  };
}
