import fs from 'fs';
import path from 'path';

// --- GLOBAL METRIC COUNTERS (Survives Next.js reloads) ---
if (!global._titan_metrics) {
    global._titan_metrics = {
        dbHits: 0,
        cacheHits: 0,
        apiCalls: 0
    };
}
let ramMetrics = global._titan_metrics;

export const trackMetric = (type, detail = 'Unknown') => {
    try {
        const logFile = path.join(process.cwd(), 'metrics.log');
        
        if (type === 'DB') ramMetrics.dbHits++;
        if (type === 'CACHE') ramMetrics.cacheHits++;
        ramMetrics.apiCalls++;

        const logEntry = `[${new Date().toISOString()}] ${type} HIT (${detail}) | Total Calls: ${ramMetrics.apiCalls} | DB: ${ramMetrics.dbHits} | CACHE: ${ramMetrics.cacheHits}\n`;
        
        fs.appendFileSync(logFile, logEntry);
        
        // const color = type === 'DB' ? '\x1b[31m' : '\x1b[32m'; // Red for DB, Green for CACHE
        // console.log(`\x1b[35m[METRICS]\x1b[0m ${color}${type}\x1b[0m [\x1b[33m${detail}\x1b[0m] | DB: ${ramMetrics.dbHits} | CACHE: ${ramMetrics.cacheHits}`);
    } catch(e) { /* Silent fail */ }

};

export const getMetrics = () => ramMetrics;
