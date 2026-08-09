import sys

with open('src/components/SettingsPanel.tsx', 'r') as f:
    content = f.read()

# The developer button section
dev_button = """                <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col items-center">
                    <button 
                        onClick={() => setIsTestRunnerOpen(true)}
                        className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-800 shadow-md text-sm active:scale-95 cursor-pointer"
                        title="Run in-app system integration tests"
                    >
                        <Terminal size={18} className="text-indigo-400" />
                        Developer: Run System Tests
                    </button>
                </div>"""

# Remove it from the bottom
content = content.replace(dev_button, "")

# Insert it at the end of the Rule Library tab, right before the closing tag of the Rule Library Tab
# The Rule Library tab ends with:
rule_library_end = """                    )}
                </div>
                )}"""

content = content.replace(
    rule_library_end,
    dev_button + "\n" + rule_library_end
)

with open('src/components/SettingsPanel.tsx', 'w') as f:
    f.write(content)

