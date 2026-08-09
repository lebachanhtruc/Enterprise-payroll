import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function handlePrint() {
  if (window.self !== window.top) {
    const url = window.location.href;
    try {
      navigator.clipboard.writeText(url);
      alert("System has AUTOMATICALLY COPIED the app link:\n" + url + "\n\n👉 Since the preview mode blocks printing, please open a new tab in your browser, PASTE the link there, and print from outside.");
    } catch (e) {
      alert("Preview mode blocks printing.\n\n👉 Please HIGHLIGHT AND COPY the URL below:\n" + url + "\n\nThen open a new browser tab, paste the link, and print directly.");
    }
    return;
  }
  
  setTimeout(() => {
    try {
      window.print();
    } catch (e) {
      console.warn("Print failed", e);
      alert("Error when browser attempted to print.");
    }
  }, 300);
}

export function hasSessionAnomaly(sessions: string[] = [], isValidated?: boolean): boolean {
    if (isValidated) return false;
    return sessions.some(s => {
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
                return diff > 9;
            }
        }
        return false;
    });
}
