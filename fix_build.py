import re

# 1. Dashboard.tsx (PieChart icon clash)
with open("src/components/Dashboard.tsx", "r") as f:
    content = f.read()

content = content.replace("import { PieChart, Pie, Cell", "import { PieChart as RechartsPieChart, Pie, Cell")
content = content.replace("<PieChart>", "<RechartsPieChart>")
content = content.replace("</PieChart>", "</RechartsPieChart>")
content = content.replace("<PieChart size={16} className=\"text-sky-500\" />", "<PieChartIcon size={16} className=\"text-sky-500\" />")
content = content.replace("import { DollarSign", "import { PieChart as PieChartIcon, DollarSign")

with open("src/components/Dashboard.tsx", "w") as f:
    f.write(content)

# 2. HistoryTab.tsx (ValidationLog.session_id)
with open("src/components/HistoryTab.tsx", "r") as f:
    content = f.read()

content = content.replace("log.session_id === 'SYSTEM_LOCK'", "(log as any).session_id === 'SYSTEM_LOCK'")

with open("src/components/HistoryTab.tsx", "w") as f:
    f.write(content)

# 3. server.ts (PORT parsing)
with open("server.ts", "r") as f:
    content = f.read()

content = content.replace('const PORT = process.env.PORT || 3000;', 'const PORT = parseInt(process.env.PORT || "3000", 10);')

with open("server.ts", "w") as f:
    f.write(content)

