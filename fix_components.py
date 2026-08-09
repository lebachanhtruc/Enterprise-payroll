import re

# 1. TimesheetInput.tsx
with open("src/components/TimesheetInput.tsx", "r") as f:
    content = f.read()

content = content.replace('className="hidden lg:block overflow-x-auto w-full relative"', 'className="hidden md:block overflow-x-auto w-full relative"')
content = content.replace('className="block lg:hidden bg-slate-50/50 min-h-[500px]"', 'className="block md:hidden bg-slate-50/50 min-h-[500px]"')
content = content.replace('className="fixed inset-0 z-[9999] lg:hidden flex flex-col justify-end"', 'className="fixed inset-0 z-[9999] md:hidden flex flex-col justify-end"')

with open("src/components/TimesheetInput.tsx", "w") as f:
    f.write(content)

# 2. SettingsPanel.tsx (Tighten spacing & density)
with open("src/components/SettingsPanel.tsx", "r") as f:
    content = f.read()

# Replace p-8 gap-8 with p-6 gap-6 for density
content = content.replace('className="p-4 md:p-8 space-y-8"', 'className="p-4 md:p-6 space-y-6"')
content = content.replace('className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"', 'className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"')

with open("src/components/SettingsPanel.tsx", "w") as f:
    f.write(content)

# 3. ImportData.tsx (Tighten empty state padding)
with open("src/components/ImportData.tsx", "r") as f:
    content = f.read()

content = content.replace('className="max-w-3xl mx-auto py-12"', 'className="max-w-3xl mx-auto py-8"')
content = content.replace('className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center"', 'className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center"')
content = content.replace('className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8"', 'className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"')
content = content.replace('<Database size={48} className="text-indigo-600" />', '<Database size={40} className="text-indigo-600" />')

with open("src/components/ImportData.tsx", "w") as f:
    f.write(content)

