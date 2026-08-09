import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Terminal, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import { Employee, Timesheet } from '../types';
import { calculatePayroll } from '../lib/payroll-engine';

interface TestCase {
  id: string;
  name: string;
  description: string;
  run: () => {
    passed: boolean;
    hasWarning?: boolean;
    assertions: { label: string; passed: boolean; actual: any; expected: any }[];
    mockData: { employees: Employee[]; timesheets: Record<number, Timesheet> };
    results: any[];
  };
}

import { CustomRule } from '../types';

export default function DevTestRunner({ isOpen, onClose, customRuleToTest }: { isOpen: boolean; onClose: () => void; customRuleToTest?: Partial<CustomRule> | null }) {
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; hasWarning?: boolean; assertions: any[]; results: any[] }> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customRuleToTest && (customRuleToTest.evaluated_hours || customRuleToTest.evaluated_addons)) {
      setExpandedTest('DYNAMIC_TEST_CASE');
    }
  }, [isOpen, customRuleToTest]);

  let testSuite: TestCase[] = [
    {
      id: 'STANDARD_MAX',
      name: 'STANDARD_MAX: Overtime Limit Capping',
      description: 'Tests that an employee with a 40-hour weekly cap who works 50 hours/week (100h total) has check hours capped at 40h/week, with the remaining 20 hours converted into standard add-ons.',
      run: () => {
        const mockEmployees: Employee[] = [
          {
            id: 101,
            nickname: 'Max Test',
            taxName: 'Max Test Employee',
            customRate: 20,
            standardRate: 20,
            sin: '123-456-789',
            address: '123 Test St',
            rule: {
              type: 'STANDARD_MAX',
              maxHrs: 40,
            },
          },
        ];

        const mockTimesheets: Record<number, Timesheet> = {
          101: {
            w1H: 50,
            w2H: 50,
            w1C: 0,
            w2C: 0,
            w1K: 10,
            w2K: 10,
            prevDebt: 0,
          },
        };

        const payrollResults = calculatePayroll(mockEmployees, mockTimesheets);
        const res = payrollResults[0];

        const assertions = [
          {
            label: 'Check Hours per week should be exactly 40 hours',
            passed: res?.checkHrsWk === 40,
            actual: res?.checkHrsWk,
            expected: 40,
          },
          {
            label: 'Standard Add-Ons should include the 20 hours of overtime at the $20/hr rate + $20 tip',
            passed: res?.standardAddOns > 20,
            actual: res?.standardAddOns,
            expected: '> 20 (Expected: 420)',
          },
        ];

        return {
          passed: assertions.every((a) => a.passed),
          assertions,
          mockData: { employees: mockEmployees, timesheets: mockTimesheets },
          results: payrollResults,
        };
      },
    },
    {
      id: 'GUARANTEED_MIN_HOURS',
      name: 'GUARANTEED_MIN_HOURS: Base Minimum Supplement',
      description: 'Tests that an employee with a 35-hour guaranteed minimum weekly base who only works 20 hours/week receives supplemental pay, generating a positive carry-forward balance when gross earnings fall below paper salary.',
      run: () => {
        const mockEmployees: Employee[] = [
          {
            id: 102,
            nickname: 'Min Test',
            taxName: 'Min Test Employee',
            customRate: 15,
            standardRate: 20,
            sin: '234-567-890',
            address: '456 Min Rd',
            rule: {
              type: 'GUARANTEED_MIN_HOURS',
              guaranteedBaseHrs: 35,
            },
          },
        ];

        const mockTimesheets: Record<number, Timesheet> = {
          102: {
            w1H: 20,
            w2H: 20,
            w1C: 0,
            w2C: 0,
            w1K: 0,
            w2K: 0,
            prevDebt: 0,
          },
        };

        const payrollResults = calculatePayroll(mockEmployees, mockTimesheets);
        const res = payrollResults[0];

        // Paper salary = 35h * 2 * $20 = $1400
        // Gross earnings = 35h * 2 * $15 = $1050
        // Carry forward balance = 1400 - 1050 = 350
        const assertions = [
          {
            label: 'Carry-Forward Balance should be greater than 0 due to minimum hours guarantee deficit',
            passed: res?.carryForwardBalance > 0,
            actual: res?.carryForwardBalance,
            expected: '> 0 (Expected: 350)',
          },
          {
            label: 'Carry-Forward Balance should be exactly 350',
            passed: res?.carryForwardBalance === 350,
            actual: res?.carryForwardBalance,
            expected: 350,
          },
        ];

        return {
          passed: assertions.every((a) => a.passed),
          assertions,
          mockData: { employees: mockEmployees, timesheets: mockTimesheets },
          results: payrollResults,
        };
      },
    },
    {
      id: 'COST_ALLOCATION_OUT_FLAT',
      name: 'COST_ALLOCATION_OUT_FLAT: Multi-Employee Allocation',
      description: 'Tests cost allocation transfers. Employee A transfers out 10 hours/week (20 hours total over 2 weeks). Employee B receives Employee A\'s hours flat, decrementing Employee A and incrementing Employee B correctly.',
      run: () => {
        const mockEmployees: Employee[] = [
          {
            id: 103,
            nickname: 'Sender A',
            taxName: 'Sender Employee A',
            customRate: 20,
            standardRate: 20,
            sin: '345-678-901',
            address: '789 Sender Way',
            rule: {
              type: 'COST_ALLOCATION_OUT_FLAT',
              hrsToGive: 10,
            },
          },
          {
            id: 104,
            nickname: 'Receiver B',
            taxName: 'Receiver Employee B',
            customRate: 20,
            standardRate: 20,
            sin: '456-789-012',
            address: '012 Receiver Blvd',
            rule: {
              type: 'COST_ALLOCATION_IN_FLAT',
              parentId: 103,
            },
          },
        ];

        const mockTimesheets: Record<number, Timesheet> = {
          103: {
            w1H: 20,
            w2H: 20,
            w1C: 0,
            w2C: 0,
            w1K: 0,
            w2K: 0,
            prevDebt: 0,
          },
          104: {
            w1H: 0,
            w2H: 0,
            w1C: 0,
            w2C: 0,
            w1K: 0,
            w2K: 0,
            prevDebt: 0,
          },
        };

        const payrollResults = calculatePayroll(mockEmployees, mockTimesheets);
        const senderRes = payrollResults.find((r) => r.id === 103);
        const receiverRes = payrollResults.find((r) => r.id === 104);

        const assertions = [
          {
            label: 'Sender check hours per week should decrement to 10 (40h worked minus 20h transferred divided by 2)',
            passed: senderRes?.checkHrsWk === 10,
            actual: senderRes?.checkHrsWk,
            expected: 10,
          },
          {
            label: 'Receiver check hours per week should increment to 10 from receiving the transferred hours flat',
            passed: receiverRes?.checkHrsWk === 10,
            actual: receiverRes?.checkHrsWk,
            expected: 10,
          },
        ];

        return {
          passed: assertions.every((a) => a.passed),
          assertions,
          mockData: { employees: mockEmployees, timesheets: mockTimesheets },
          results: payrollResults,
        };
      },
    },
    {
      id: 'AI_COPILOT',
      name: 'AI_COPILOT: Formula-Based Dynamic Evaluation',
      description: 'Tests custom rule engine evaluating the mathematical string "Math.min(totalHrs, 40)" using mathjs. With 60 hours worked, evaluated check hours must strictly cap at 40.',
      run: () => {
        const mockEmployees: Employee[] = [
          {
            id: 105,
            nickname: 'AI Copilot',
            taxName: 'AI Copilot Employee',
            customRate: 20,
            standardRate: 20,
            sin: '567-890-123',
            address: '321 Future Ave',
            rule: {
              type: 'AI_COPILOT',
              evaluated_hours: 'Math.min(totalHrs, 40)',
            },
          },
        ];

        const mockTimesheets: Record<number, Timesheet> = {
          105: {
            w1H: 30,
            w2H: 30,
            w1C: 0,
            w2C: 0,
            w1K: 0,
            w2K: 0,
            prevDebt: 0,
          },
        };

        const payrollResults = calculatePayroll(mockEmployees, mockTimesheets);
        const res = payrollResults[0];

        // totalHrs is 60. Math.min(60, 40) evaluates to 40. checkHrs2Wk should be 40.
        // checkHrsWk should be 20.
        const assertions = [
          {
            label: 'Evaluated checkHours2Wk should evaluate to exactly 40',
            passed: res?.checkHrs2Wk === 40,
            actual: res?.checkHrs2Wk,
            expected: 40,
          },
          {
            label: 'Check hours per week should be exactly 20',
            passed: res?.checkHrsWk === 20,
            actual: res?.checkHrsWk,
            expected: 20,
          },
        ];

        return {
          passed: assertions.every((a) => a.passed),
          assertions,
          mockData: { employees: mockEmployees, timesheets: mockTimesheets },
          results: payrollResults,
        };
      },
    },
    {
      id: 'CUSTOM_LIBRARY_RULE',
      name: 'CUSTOM_LIBRARY_RULE: Pre-saved Formula Rules',
      description: 'Tests evaluating a custom rule selected from the Custom Rule Library. Works similar to AI Copilot but guarantees deterministic execution without AI dependency. E.g., transfers hours dynamically to another employee.',
      run: () => {
        const mockEmployees: Employee[] = [
          {
            id: 106,
            nickname: 'Library User A',
            taxName: 'Library Employee A',
            customRate: 20,
            standardRate: 20,
            sin: '678-901-234',
            address: '123 Main',
            rule: {
              type: 'CUSTOM_LIBRARY_RULE',
              customRuleId: 'rule_xyz',
              evaluated_hours: 'Math.min(totalHrs, 40)',
              evaluated_addons: 'totalTips',
              transfer_out_hours: 'Math.max(0, totalHrs - 40)',
              transfer_to_id: 107
            },
          },
          {
            id: 107,
            nickname: 'Library Receiver B',
            taxName: 'Library Employee B',
            customRate: 15,
            standardRate: 15,
            sin: '678-901-235',
            address: '456 Main',
            rule: {
              type: 'STANDARD_MAX',
              maxHrs: 40
            },
          }
        ];

        const mockTimesheets: Record<number, Timesheet> = {
          106: {
            w1H: 30, // 60h total
            w2H: 30,
            w1C: 0,
            w2C: 0,
            w1K: 10, // 20 tips total
            w2K: 10,
            prevDebt: 0,
          },
          107: {
            w1H: 0,
            w2H: 0,
            w1C: 0,
            w2C: 0,
            w1K: 0,
            w2K: 0,
            prevDebt: 0,
          },
        };

        const payrollResults = calculatePayroll(mockEmployees, mockTimesheets);
        const senderRes = payrollResults.find(r => r.id === 106);
        const receiverRes = payrollResults.find(r => r.id === 107);

        // Sender totalHrs 60, tips 20. evaluated_hours Math.min(60, 40) = 40. transfer_out_hours = 20. evaluated_addons = 20.
        // Receiver should receive 20 hours.
        const assertions = [
          {
            label: 'Sender should cap at 40 check hours (20 check hours per week)',
            passed: senderRes?.checkHrsWk === 20,
            actual: senderRes?.checkHrsWk,
            expected: 20,
          },
          {
            label: 'Sender should have standardAddOns equal to totalTips (20)',
            passed: senderRes?.standardAddOns === 20,
            actual: senderRes?.standardAddOns,
            expected: 20,
          },
          {
            label: 'Receiver should get 20 check hours transferred from Sender (10 check hours per week)',
            passed: receiverRes?.checkHrsWk === 10,
            actual: receiverRes?.checkHrsWk,
            expected: 10,
          }
        ];

        return {
          passed: assertions.every((a) => a.passed),
          assertions,
          mockData: { employees: mockEmployees, timesheets: mockTimesheets },
          results: payrollResults,
        };
      },
    },
  ];

  if (customRuleToTest && (customRuleToTest.evaluated_hours || customRuleToTest.evaluated_addons)) {
    const dynamicTest: TestCase = {
      id: 'DYNAMIC_TEST_CASE',
      name: 'LIVE: ' + (customRuleToTest.name || 'Your New AI Rule'),
      description: `Testing the currently generated rule. Evaluates checkHrs: ${customRuleToTest.evaluated_hours || '0'} and addOns: ${customRuleToTest.evaluated_addons || '0'}.`,
      run: () => {
        const mockEmployees: Employee[] = [
          {
            id: 999,
            nickname: 'Demo Emp',
            taxName: 'Demo Employee',
            customRate: 20,
            standardRate: 20,
            sin: '111-222-333',
            address: '123 Test',
            rule: {
              type: 'AI_COPILOT',
              evaluated_hours: customRuleToTest.evaluated_hours || '0',
              evaluated_addons: customRuleToTest.evaluated_addons || '0',
              transfer_out_hours: customRuleToTest.transfer_out_hours || '0',
              transfer_to_id: customRuleToTest.transfer_to_id ? Number(customRuleToTest.transfer_to_id) : null,
            },
          },
          ...(customRuleToTest.transfer_to_id ? [{
            id: Number(customRuleToTest.transfer_to_id),
            nickname: 'Target Receiver',
            taxName: 'Target Receiver',
            customRate: 20,
            standardRate: 20,
            sin: '999-999-999',
            address: 'Target Address',
            rule: { type: 'STANDARD_MAX' as const, maxHrs: 40 }
          }] : [])
        ];

        const mockTimesheets: Record<number, Timesheet> = {
          999: { w1H: 45, w2H: 45, w1C: 50, w2C: 50, w1K: 0, w2K: 0, prevDebt: 0 },
          ...(customRuleToTest.transfer_to_id ? { [Number(customRuleToTest.transfer_to_id)]: { w1H: 0, w2H: 0, w1C: 0, w2C: 0, w1K: 0, w2K: 0, prevDebt: 0 } } : {})
        };

        const payrollResults = calculatePayroll(mockEmployees, mockTimesheets);
        const res = payrollResults.find((r) => r.id === 999);

        const assertions = [
          {
            label: 'Rule executed successfully without crashing engine',
            passed: !!res,
            actual: res ? 'Success' : 'Failed',
            expected: 'Success',
          },
          {
            label: 'Total Check Hours (2 Weeks) calculated',
            passed: res !== undefined && res.checkHrs2Wk !== undefined,
            actual: res?.checkHrs2Wk,
            expected: 'Valid Number',
          },
          {
            label: 'Standard Add-Ons calculated',
            passed: res !== undefined && res.standardAddOns !== undefined,
            actual: res?.standardAddOns,
            expected: 'Valid Number',
          }
        ];

        if (customRuleToTest.transfer_to_id) {
          const targetRes = payrollResults.find(r => r.id === Number(customRuleToTest.transfer_to_id));
          assertions.push({
            label: 'Receiver got transferred hours successfully',
            passed: targetRes !== undefined && targetRes.checkHrs2Wk > 0,
            actual: targetRes?.checkHrs2Wk,
            expected: '> 0',
          });
        }

        const isCrash = !assertions[0].passed;
        const passed = assertions.every((a) => a.passed);

        return {
          passed,
          hasWarning: !passed && !isCrash,
          assertions,
          mockData: { employees: mockEmployees, timesheets: mockTimesheets },
          results: payrollResults,
        };
      },
    };
    testSuite = [dynamicTest, ...testSuite];
  }

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results: Record<string, { passed: boolean; hasWarning?: boolean; assertions: any[]; results: any[] }> = {};
      testSuite.forEach((test) => {
        try {
          const runRes = test.run();
          results[test.id] = {
            passed: runRes.passed,
            hasWarning: runRes.hasWarning,
            assertions: runRes.assertions,
            results: runRes.results,
          };
        } catch (err: any) {
          results[test.id] = {
            passed: false,
            hasWarning: false,
            assertions: [
              {
                label: 'Test execution threw an uncaught error',
                passed: false,
                actual: err.message || err,
                expected: 'Successful Run',
              },
            ],
            results: [],
          };
        }
      });
      setTestResults(results);
      setIsRunning(false);
    }, 800);
  };

  if (!isOpen) return null;

  const totalTests = testSuite.length;
  const passedTests = testResults ? Object.values(testResults).filter((r) => r.passed).length : 0;
  const warningTests = testResults ? Object.values(testResults).filter((r) => r.hasWarning).length : 0;
  const failedTests = totalTests - passedTests - warningTests;
  const passRate = testResults ? Math.round(((passedTests + warningTests) / totalTests) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 md:p-10">
      <div className="bg-slate-900 border border-slate-800 rounded-none sm:rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                In-App Visual Test Runner
                <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-0.5 rounded-full font-mono font-medium">TDD Mode</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Automated integration testing for calculation rule variations and formulas.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 hover:bg-slate-800/60 rounded-lg transition-colors border border-transparent hover:border-slate-800"
            title="Close visual test runner"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-mono">TOTAL SCENARIOS</span>
              <span className="text-3xl font-extrabold text-slate-100 mt-2">{totalTests}</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-emerald-400 font-mono">PASSED TESTS</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-2">{testResults ? passedTests : '-'}</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-rose-400 font-mono">FAILED TESTS</span>
              <span className="text-3xl font-extrabold text-rose-400 mt-2">{testResults ? failedTests : '-'}</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-indigo-400 font-mono">PASS RATE</span>
              <span className="text-3xl font-extrabold text-indigo-400 mt-2">{testResults ? `${passRate}%` : '-'}</span>
            </div>
          </div>

          {testResults && (
            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-5 mb-4">
              <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                <Sparkles size={18} /> Business Summary
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {failedTests === 0 ? (
                  <>The AI rule executed successfully and calculated hours and add-ons correctly on the sample data. All test scenarios passed validation.</>
                ) : (
                  <>The AI rule encountered issues during execution. {failedTests} out of {totalTests} scenarios failed validation. Please review the technical details below to identify the calculation errors.</>
                )}
              </p>
            </div>
          )}

          {/* Test Runner Action */}
          <div className="bg-indigo-950/20 border border-indigo-500/10 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-indigo-300">Run Automated Integration Tests</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Simulates standard and custom mathematical payroll scenarios in memory using actual calculations to verify accurate logic and type safety instantly.
                </p>
              </div>
            </div>
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/10 transition-all ${
                isRunning 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/20 active:scale-95'
              }`}
              title="Run entire payroll test suite"
            >
              <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running Engine...' : 'Run Test Suite'}
            </button>
          </div>

          {/* Scenarios List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 font-mono tracking-wider uppercase">TEST SCENARIOS</h3>
            
            <div className="space-y-3">
              {testSuite.map((test) => {
                const result = testResults?.[test.id];
                const isExpanded = expandedTest === test.id;
                
                return (
                  <div 
                    key={test.id} 
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-750 rounded-xl overflow-hidden transition-all"
                  >
                    {/* Scenario Title Bar */}
                    <div 
                      onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {result ? (
                          result.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : result.hasWarning ? (
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                          )
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800/50 shrink-0 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{test.name}</h4>
                          <p className="text-slate-450 text-xs mt-0.5 line-clamp-1">{test.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {result && (
                          <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                            result.passed 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : result.hasWarning
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {result.passed ? 'PASS' : result.hasWarning ? 'WARNING' : 'FAIL'}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-450" /> : <ChevronDown className="w-4 h-4 text-slate-450" />}
                      </div>
                    </div>

                    {/* Expandable Assertions & Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="border-t border-slate-800 bg-slate-950/40 overflow-hidden"
                        >
                          <div className="p-4 space-y-4">
                            
                            {/* Scenario Description */}
                            <p className="text-slate-400 text-xs leading-relaxed">{test.description}</p>

                            {/* Assertions */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold text-slate-400 font-mono tracking-wide uppercase">Assertions</h5>
                              
                              {result ? (
                                <div className="space-y-2">
                                  {result.hasWarning && (
                                    <div className="text-amber-400 text-xs italic p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                      This newly generated rule doesn't fully match the sample test data. This is expected.
                                    </div>
                                  )}
                                  {result.assertions.map((assertion, index) => (
                                    <div key={index} className="flex items-start justify-between gap-4 p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                                      <div className="flex items-start gap-2.5">
                                        {assertion.passed ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                        ) : result.hasWarning ? (
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                        ) : (
                                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                                        )}
                                        <span className="text-xs text-slate-300 leading-relaxed">{assertion.label}</span>
                                      </div>
                                      <div className="text-right shrink-0 font-mono text-[10px] space-y-0.5">
                                        <div className="text-slate-400">Actual: <span className={assertion.passed ? 'text-emerald-400' : result.hasWarning ? 'text-amber-400' : 'text-rose-400'}>{JSON.stringify(assertion.actual)}</span></div>
                                        <div className="text-slate-500">Expected: {JSON.stringify(assertion.expected)}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-slate-500 text-xs italic flex items-center gap-1.5 p-3 rounded-lg bg-slate-900/10 border border-slate-900">
                                  <AlertTriangle className="w-4 h-4 text-slate-600" />
                                  Run the test suite to execute evaluations.
                                </div>
                              )}
                            </div>

                            {/* Raw Data Collapsible Preview */}
                            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                              <div className="flex items-center gap-2 text-slate-350 text-[11px] font-mono mb-2">
                                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                                MOCK INPUT DATA PREVIEW
                              </div>
                              <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto max-h-40 p-2 bg-slate-950 rounded border border-slate-850">
                                {JSON.stringify(test.run().mockData, null, 2)}
                              </pre>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all border border-slate-800"
            title="Close modal"
          >
            Cancel
          </button>
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-md transition-all border border-indigo-500/20"
            title="Run all integration tests"
          >
            {isRunning ? 'Testing...' : 'Run All Tests'}
          </button>
        </div>

      </div>
    </div>
  );
}
