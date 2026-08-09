import { Employee, Timesheet } from '../types';

export async function processPOSFiles(
    files: FileList, 
    periodStart: string, 
    employees: Employee[], 
    currentTimesheets: Record<number, Timesheet>
) {
    const uniqueFilesMap = new Map<string, File>();
    let duplicateCount = 0;

    const pStart = new Date(periodStart + 'T12:00:00Z');
    const w1End = new Date(pStart);
    w1End.setDate(w1End.getDate() + 6); // end of week 1

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Clean name like "Report (1).csv" -> "Report.csv"
        const cleanName = file.name.replace(/\s*\(\d+\)/g, '');
        
        if (uniqueFilesMap.has(cleanName)) {
            duplicateCount++;
            if (file.lastModified > uniqueFilesMap.get(cleanName)!.lastModified) {
                uniqueFilesMap.set(cleanName, file);
            }
        } else {
            uniqueFilesMap.set(cleanName, file);
        }
    }

    const filesToProcess = Array.from(uniqueFilesMap.values());
    const aggregatedDetails: Record<string, any> = {}; 
    const newAnomalies: any[] = []; 

    const normalizeName = (str: string) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
    };

    const processFile = async (file: File, i: number) => {
        // Extract date from filename, assuming format DD-MM-YYYY or YYYY-MM-DD
        const dateMatch = file.name.match(/(\d{2,4}[\.\-_]\d{2}[\.\-_]\d{2,4})/);
        const fileDate = dateMatch ? dateMatch[1].replace(/[\-_]/g, '.') : `Day ${i+1}`;

        let isWeek1 = true; 
        if (dateMatch) {
            const parts = fileDate.split('.');
            let fDate: Date | null = null;
            if (parts.length === 3) {
                if (parts[0].length === 4) fDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`);
                else fDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
            }
            if (fDate && !isNaN(fDate.getTime())) {
                isWeek1 = fDate.getTime() <= w1End.getTime();
            }
        }

        const text = await file.text();
        const lines = text.split('\n');
        for (let j = 1; j < lines.length; j++) {
            const line = lines[j].trim();
            if (!line) continue;
            
            let cleanParts;
            if (line.includes('","')) cleanParts = line.replace(/^"|"$/g, '').split('","').map(s => s.trim());
            else cleanParts = line.split(',').map(s => s.replace(/^"|"$/g, '').trim());

            if (cleanParts.length >= 4) {
                let name = cleanParts[0];
                if (name.toLowerCase().includes('total')) continue;
                
                let session = cleanParts[1];
                let hrsStr = cleanParts[3];
                let hrs = parseFloat(hrsStr);
                
                if (!isNaN(hrs)) {
                    if (hrs > 9) {
                        newAnomalies.push({ name, date: fileDate, session, hrs });
                    }

                    let normName = normalizeName(name);
                    if (!aggregatedDetails[normName]) aggregatedDetails[normName] = { originalName: name, logs: {}, w1Hrs: 0, w2Hrs: 0 };
                    if (!aggregatedDetails[normName].logs[fileDate]) aggregatedDetails[normName].logs[fileDate] = { sessions: [], hrs: 0, isWeek1: isWeek1, hasAnomaly: false };
                    
                    aggregatedDetails[normName].logs[fileDate].sessions.push(session);
                    aggregatedDetails[normName].logs[fileDate].hrs += hrs;
                    if (hrs > 9) aggregatedDetails[normName].logs[fileDate].hasAnomaly = true;
                    
                    if (isWeek1) aggregatedDetails[normName].w1Hrs += hrs;
                    else aggregatedDetails[normName].w2Hrs += hrs;
                }
            }
        }
    };

    await Promise.all(filesToProcess.map((file, i) => processFile(file, i)));

    let matchedNamesCount = 0;
    const newTs = { ...currentTimesheets };
    
    employees.forEach(emp => {
        const empNameNorm = normalizeName(emp.nickname);
        let matchedHrs = 0; 
        let matchedW1Hrs = 0; 
        let matchedW2Hrs = 0;
        let empLogsMap: Record<string, any> = {};
        
        Object.keys(aggregatedDetails).forEach(csvNameNorm => {
            if (csvNameNorm.includes(empNameNorm) || empNameNorm.includes(csvNameNorm)) {
                const data = aggregatedDetails[csvNameNorm];
                matchedW1Hrs += data.w1Hrs || 0;
                matchedW2Hrs += data.w2Hrs || 0;
                Object.keys(data.logs).forEach(date => {
                    if(!empLogsMap[date]) empLogsMap[date] = { sessions: [], hrs: 0, isWeek1: data.logs[date].isWeek1, hasAnomaly: false };
                    empLogsMap[date].sessions.push(...data.logs[date].sessions);
                    empLogsMap[date].hrs += data.logs[date].hrs;
                    if (data.logs[date].hasAnomaly) empLogsMap[date].hasAnomaly = true;
                    matchedHrs += data.logs[date].hrs;
                });
                delete aggregatedDetails[csvNameNorm]; 
                matchedNamesCount++;
            }
        });

        if (matchedHrs > 0) {
            const currentTs = newTs[emp.id] || { w1C: '', w1K: '', w2C: '', w2K: '', prevDebt: '' };
            const posLogsArray = Object.keys(empLogsMap).map(date => ({
                date: date, sessions: empLogsMap[date].sessions, hrs: empLogsMap[date].hrs, isWeek1: empLogsMap[date].isWeek1, hasAnomaly: empLogsMap[date].hasAnomaly
            })).sort((a, b) => {
    const getComparableDate = (d: string) => {
        const parts = d.split('.');
        if (parts.length === 3) {
            if (parts[0].length === 4) return parts[0] + parts[1] + parts[2];
            if (parts[2].length === 4) return parts[2] + parts[1] + parts[0];
        }
        return d;
    };
    const dateCmp = getComparableDate(a.date).localeCompare(getComparableDate(b.date));
    if (dateCmp !== 0) return dateCmp;
    if ((a as any).name && (b as any).name) return (a as any).name.localeCompare((b as any).name);
    if (a.sessions && b.sessions) return (a.sessions[0] || '').localeCompare(b.sessions[0] || '');
    return 0;
});

            newTs[emp.id] = {
                ...currentTs,
                w1H: matchedW1Hrs > 0 ? parseFloat(matchedW1Hrs.toFixed(2)) : '',
                w2H: matchedW2Hrs > 0 ? parseFloat(matchedW2Hrs.toFixed(2)) : '',
                posLogs: posLogsArray,
                posTotalHrs: matchedHrs
            } as Timesheet;
        }
    });

    const unmatched = Object.keys(aggregatedDetails).map(k => aggregatedDetails[k].originalName);
    let alertMsg = "";
    if (duplicateCount > 0) alertMsg += `⚠️ Merged and ignored ${duplicateCount} duplicate files from the same day.\n\n`;
    if (unmatched.length > 0) alertMsg += `Some names from POS do not match any employee in the system: \n${unmatched.join(', ')}\n\n`;
    alertMsg += `Successfully updated hours for ${matchedNamesCount} employees.`;

    
    newAnomalies.sort((a, b) => {
    const getComparableDate = (d: string) => {
        const parts = d.split('.');
        if (parts.length === 3) {
            if (parts[0].length === 4) return parts[0] + parts[1] + parts[2];
            if (parts[2].length === 4) return parts[2] + parts[1] + parts[0];
        }
        return d;
    };
    const dateCmp = getComparableDate(a.date).localeCompare(getComparableDate(b.date));
    if (dateCmp !== 0) return dateCmp;
    if ((a as any).name && (b as any).name) return (a as any).name.localeCompare((b as any).name);
    if (a.sessions && b.sessions) return (a.sessions[0] || '').localeCompare(b.sessions[0] || '');
    return 0;
});
    return { updatedTimesheets: newTs, newAnomalies, alertMsg };

}
