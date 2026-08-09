import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  LayoutDashboard, Users, Calculator, Settings, AlertTriangle,
  History, Printer, FileJson
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';

import { calculatePayroll } from './lib/payroll-engine';
import { useUI } from './contexts/UIContext';
import { usePayrollState } from './hooks/usePayrollState';

// Import Components
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import TimesheetInput from './components/TimesheetInput';
import Reports from './components/Reports';
import HistoryTab from './components/HistoryTab';
import ImportData from './components/ImportData';
import SettingsPanel from './components/SettingsPanel';
import PosModals from './components/PosModals';
import WorkspaceGuard from './components/WorkspaceGuard';
import Sidebar, { NavItem } from './components/Sidebar';

function AppContent() {
  const { session, role, companyId, signOut } = useAuth();
  const { showToast, showConfirm } = useUI();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [dbStatus, setDbStatus] = useState<'stable' | 'disconnected' | 'checking'>('checking');
  const [showDbError, setShowDbError] = useState(false);
    // Sync Supabase Auth session with workspace settings
  useEffect(() => {
    if (!supabase) return;
    
    // Check initial user session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        setSettings((prev: any) => ({
          ...prev,
          companyId: user.user_metadata?.company_id || '',
          companyName: user.user_metadata?.company_name || '',
          userEmail: user.email || ''
        }));
      }
    });

    // Subscribe to authentication state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        setSettings((prev: any) => ({
          ...prev,
          companyId: user.user_metadata?.company_id || '',
          companyName: user.user_metadata?.company_name || '',
          userEmail: user.email || ''
        }));
      } else {
        setSettings((prev: any) => ({
          ...prev,
          companyId: '',
          companyName: '',
          userEmail: ''
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const checkDb = async () => {
      try {
        const { error } = await supabase.from('payroll_logs').select('count', { count: 'exact', head: true });
        if (error) {
           console.error('DB Connection Error:', error);
           setDbStatus('disconnected');
           setShowDbError(true);
        } else {
           setDbStatus('stable');
        }
      } catch (e) {
         console.error('DB Connection Error:', e);
         setDbStatus('disconnected');
         setShowDbError(true);
      }
    };
    checkDb();
  }, [session]);

  const isDemoUser = session?.user?.is_anonymous;
  const [demoTimeRemaining, setDemoTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isDemoUser || !companyId) {
      setDemoTimeRemaining(null);
      return;
    }

    const DEMO_DURATION_MS = 10 * 60 * 1000;
    const storageKey = `demo_expiration_${companyId}`;
    
    let expirationTime = localStorage.getItem(storageKey);
    
    if (!expirationTime) {
      expirationTime = (Date.now() + DEMO_DURATION_MS).toString();
      localStorage.setItem(storageKey, expirationTime);
    }
    
    const targetTime = parseInt(expirationTime, 10);

    const updateTimer = async () => {
      const now = Date.now();
      const remaining = targetTime - now;
      
      if (remaining <= 0) {
        setDemoTimeRemaining(0);
        localStorage.removeItem(storageKey);
        
        // Time's up! Explicitly clean up data, then sign out.
        if (session?.access_token) {
           supabase.rpc('fn_cleanup_sandbox', { p_company_id: companyId }).then(({ error }) => { if (error) console.error(error); });
        }
        
        showToast('Demo session expired. All temporary data has been securely erased.', 'info');
        signOut();
      } else {
        setDemoTimeRemaining(Math.ceil(remaining / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isDemoUser, companyId, signOut, showToast, session?.access_token]);

  // Aggressive cleanup on tab close / leave
  useEffect(() => {
    if (!isDemoUser || !session?.access_token) return;
    
    const handleUnload = () => {
      supabase.rpc('fn_cleanup_sandbox', { p_company_id: companyId }).then(({ error }) => { if (error) console.error(error); });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleUnload();
      }
    };

    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDemoUser, session?.access_token]);

  const {
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
    handlePosLogEdit,
    handlePosLogValidate,
  } = usePayrollState(companyId, isDemoUser);

  const payrollResults = useMemo(() => calculatePayroll(employees, timesheets), [employees, timesheets]);

  const stats = useMemo(() => ({
    gross: payrollResults.reduce((sum, r) => sum + r.grossEarnings, 0),
    hrs: payrollResults.reduce((sum, r) => sum + r.totalHrs, 0),
    addons: payrollResults.reduce((sum, r) => sum + r.standardAddOns, 0)
  }), [payrollResults]);

  const pastMetrics = useMemo(() => {
      if (!pastData || !pastData.employees || !pastData.timesheets) return null;
      const pData = pastData.payrollData || calculatePayroll(pastData.employees, pastData.timesheets);
      return {
          gross: pData.reduce((sum: number, d: any) => sum + (d.grossEarnings || 0), 0),
          hrs: pData.reduce((sum: number, d: any) => sum + (d.totalHrs || 0), 0),
          addons: pData.reduce((sum: number, d: any) => sum + (d.standardAddOns || 0), 0)
      };
  }, [pastData]);

  const handleTimeChange = (empId: number, field: string, value: string | number) => {
    setTimesheets(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || { w1H: '', w1C: '', w1K: '', w2H: '', w2C: '', w2K: '', prevDebt: '' }), [field]: value }
    }));
    setHasUnsavedChanges(true);
  };

  const getFormattedPeriod = () => {
    try {
      if (settings.periodStart && settings.periodEnd) {
        return `${format(parseISO(settings.periodStart), 'MMM dd')} - ${format(parseISO(settings.periodEnd), 'MMM dd, yyyy')}`;
      }
    } catch (e) {
      console.warn("Invalid period dates", e);
    }
    return "Select Period";
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'settings', label: '1. System Configuration', icon: Settings, hideFor: ['MANAGER'] },
    { id: 'import', label: '2. Cycle Initialization', icon: FileJson, hideFor: ['MANAGER'] },
    { id: 'employees', label: '3. Staff Management', icon: Users, hideFor: ['MANAGER'] },
    { id: 'input', label: '4. Timesheet Processing', icon: Calculator },
    { id: 'reports', label: '5. Reconciliation & Execution', icon: Printer, hideFor: ['MANAGER'] },
    { id: 'history', label: '6. Audit Ledger', icon: History, hideFor: ['MANAGER'] },
  ];

  const isHydratingDemo = isDemoUser && (isLoadingEmployees || employees.length === 0 || Object.keys(timesheets).length === 0);

  if (!session || isHydratingDemo) {
      return <Login isHydratingDemo={isHydratingDemo} />;
  }

  if (!settings.companyId && !companyId) {
      return <WorkspaceGuard userEmail={session.user?.email} onSignOut={signOut} />;
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {isDemoUser && (
        <div className="bg-emerald-600 text-emerald-50 text-center py-2 px-4 text-sm font-medium z-50 shadow-sm border-b border-emerald-700 w-full shrink-0 flex items-center justify-center gap-2">
          👋 Welcome to the Lime Payroll Interactive Demo! You are viewing a temporary demo workspace.
          {demoTimeRemaining !== null && (
            <span className="bg-emerald-700 px-2 py-0.5 rounded text-emerald-100 tabular-nums ml-2 font-bold tracking-widest">
              Demo expires in: {formatTime(demoTimeRemaining)}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden bg-slate-50 font-sans">
        <AnimatePresence>
        {showDbError && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-rose-50 border-2 border-rose-200 text-rose-800 px-6 py-4 rounded-xl shadow-xl flex items-center gap-4 max-w-lg w-full"
          >
            <div className="bg-rose-100 p-2 rounded-full">
              <AlertTriangle className="text-rose-600" size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-rose-900 mb-0.5">Database Disconnected</h4>
              <p className="text-sm font-semibold opacity-90">Cannot save data online. Check your connection.</p>
            </div>
            <button onClick={() => setShowDbError(false)} className="text-rose-400 hover:text-rose-600 bg-rose-100 hover:bg-rose-200 p-2 rounded-full transition-colors" title="Dismiss error notification">
              <span className="sr-only">Close</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        companyId={companyId}
        userEmail={session.user?.email}
        onSignOut={signOut}
        navItems={navItems}
        hasUnsavedChanges={hasUnsavedChanges}
        setHasUnsavedChanges={setHasUnsavedChanges}
        showToast={showToast}
        showConfirm={showConfirm}
      />

      <main className={`flex-1 min-w-0 overflow-auto bg-slate-50 relative print:overflow-visible print:bg-white ${showAnomaliesModal || viewLogsConfig ? 'print-hidden' : ''}`}>
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center print-hidden">
          <div>
            <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">{navItems.find(i => i.id === activeTab)?.label}</h2>
            <div className="text-2xl font-bold text-slate-800 tracking-tight">{settings.companyId ? settings.companyName : "Select a company"}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Payroll Period</div>
              <div className="text-sm font-semibold text-slate-800">{getFormattedPeriod()}</div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === 'dashboard' && <Dashboard stats={stats} results={payrollResults} pastMetrics={pastMetrics} dbStatus={dbStatus} isLoadingEmployees={isLoadingEmployees} />}
              {activeTab === 'employees' && <EmployeeList employees={employees} setEmployees={setEmployees} settings={settings} isLoadingEmployees={isLoadingEmployees} />}
              {activeTab === 'input' && <TimesheetInput 
                employees={employees} timesheets={timesheets} onTimeChange={handleTimeChange} setTimesheets={setTimesheets} 
                settings={settings} setAnomalies={setAnomalies} setShowAnomaliesModal={setShowAnomaliesModal} setViewLogsConfig={setViewLogsConfig} 
                hasUnsavedChanges={hasUnsavedChanges} setHasUnsavedChanges={setHasUnsavedChanges} isLoadingEmployees={isLoadingEmployees}
              />}
              {activeTab === 'reports' && <Reports results={payrollResults} settings={settings} employees={employees} timesheets={timesheets} isLoadingEmployees={isLoadingEmployees} />}
              {activeTab === 'history' && <HistoryTab employees={employees} settings={settings} isDemoUser={isDemoUser} />}
              {activeTab === 'import' && <ImportData employees={employees} timesheets={timesheets} settings={settings} pastData={pastData}
                setPastData={setPastData} setEmployees={setEmployees} setSettings={setSettings} setTimesheets={setTimesheets} setActiveTab={setActiveTab} />}
              {activeTab === 'settings' && <SettingsPanel settings={settings} setSettings={setSettings} setActiveTab={setActiveTab} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <PosModals 
          settings={settings}
          anomalies={anomalies}
          showAnomaliesModal={showAnomaliesModal}
          setShowAnomaliesModal={setShowAnomaliesModal}
          setAnomalies={setAnomalies}
          viewLogsConfig={viewLogsConfig}
          setViewLogsConfig={setViewLogsConfig}
          employees={employees}
          timesheets={timesheets}
          handlePosLogEdit={handlePosLogEdit}
          handlePosLogValidate={handlePosLogValidate}
      />
      </div>
    </div>
  );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
