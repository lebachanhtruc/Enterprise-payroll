import sys

with open('src/components/SettingsPanel.tsx', 'r') as f:
    lines = f.readlines()

def find_line(search_str, start_idx=0):
    for i in range(start_idx, len(lines)):
        if search_str in lines[i]:
            return i
    return -1

# 1. State
idx = find_line('const { showToast, showConfirm } = useUI();')
lines[idx] = "    const { showToast, showConfirm, isCompactMode, setIsCompactMode } = useUI();\n    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'access' | 'rules'>('general');\n"

# 2. Add Tabs UI and Open General Tab
idx = find_line('<div className="space-y-6">')
tabs_ui = """            {/* TABS NAVIGATION */}
            <div className="flex space-x-1 border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar pb-px">
                <button
                    onClick={() => setActiveSettingsTab('general')}
                    className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeSettingsTab === 'general' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveSettingsTab('access')}
                    className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeSettingsTab === 'access' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Access Control
                </button>
                <button
                    onClick={() => setActiveSettingsTab('rules')}
                    className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeSettingsTab === 'rules' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Rule Library
                </button>
            </div>
            <div className="space-y-6">
                {/* GENERAL TAB */}
                {activeSettingsTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
"""
# also inject Compact Mode Toggle after Current Workspace
idx2 = find_line('</div>', find_line('Current Workspace'))
compact_mode_ui = """
                        {/* COMPACT MODE TOGGLE */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-indigo-200 transition-colors mt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Compact UI Mode</h4>
                                    <p className="text-sm text-slate-500">Reduce padding and font sizes to fit more data on screen (ideal for large monitors).</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={isCompactMode}
                                        onChange={() => setIsCompactMode(!isCompactMode)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
"""
lines[idx2] = lines[idx2] + compact_mode_ui
lines[idx] = tabs_ui

# 3. Close General Tab, Open Access Control Tab
idx3 = find_line('{/* Workspace Access Control */}')
lines[idx3] = """                    </div>
                )}
                {/* ACCESS CONTROL TAB */}
                {activeSettingsTab === 'access' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
""" + lines[idx3]

# 4. Close Access Control Tab, Open Rule Library Tab
idx4 = find_line('{/* Custom Rule Library */}')
lines[idx4] = """                    </div>
                )}
                {/* RULE LIBRARY TAB */}
                {activeSettingsTab === 'rules' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
""" + lines[idx4]

# 5. Close Rule Library Tab
# We look for the "Save & Continue" button which is at `<div className="pt-8 flex justify-between gap-4">`
idx5 = find_line('<div className="pt-8 flex justify-between gap-4">')
lines[idx5] = """                    </div>
                )}
""" + lines[idx5]

with open('src/components/SettingsPanel.tsx', 'w') as f:
    f.writelines(lines)

