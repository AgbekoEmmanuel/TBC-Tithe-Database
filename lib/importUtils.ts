import { read, utils, WorkBook } from 'xlsx';
import { Fellowship, Member, Transaction, PaymentMethod } from '../types';
import { getSundayDate } from './dateUtils';

// Helper to sanitize headers
const sanitize = (str: any) => String(str || '').trim().toUpperCase();

// Simple ID Generator from string
const generateId = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `GEN-${Math.abs(hash)}`;
};

export const parseExcelData = async (file: File, year: string) => {
    const data = await file.arrayBuffer();
    const workbook = read(data);

    const members: Member[] = [];
    const transactions: Transaction[] = [];
    const warnings: string[] = [];

    // Iterate Sheets
    workbook.SheetNames.forEach(sheetName => {
        // 1. Detect Fellowship
        const fellowshipName = Object.values(Fellowship).find(f =>
            sanitize(sheetName).includes(sanitize(f)) || sanitize(f).includes(sanitize(sheetName))
        );

        if (!fellowshipName) {
            // warnings.push(`Skipping sheet "${sheetName}": Could not match to a Fellowship.`);
            return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // 2. Find Header Row (Look for "MEMBER NAME" and "CONTACT")
        let headerRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            const rowStr = rows[i].map(c => sanitize(c)).join(' ');
            if (rowStr.includes('MEMBER NAME') && rowStr.includes('CONTACT')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            // Fallback for older format
            for (let i = 0; i < rows.length; i++) {
                const rowStr = rows[i].map(c => sanitize(c)).join(' ');
                if (rowStr.includes('MEMBER NAME') && rowStr.includes('MEMBER ID')) {
                    headerRowIndex = i;
                    break;
                }
            }
            if (headerRowIndex === -1) {
                warnings.push(`Skipping sheet "${sheetName}": Could not find 'MEMBER NAME' and 'CONTACT' header row.`);
                return;
            }
        }

        const headerRow = rows[headerRowIndex];

        // Find YTD Column (Look for "YEAR TO DATE TOTAL")
        const ytdIdx = headerRow.findIndex((c: any) => sanitize(c).includes('YEAR TO DATE TOTAL'));

        // 3. Map Columns to Months/Weeks
        const monthRow = rows[headerRowIndex - 1]; // Assumption: Month is usually above the header

        // ... (existing month logic stays same)
        // Create a map of ColIndex -> { Month, Week }
        const colMap: Record<number, { month: string, week: number }> = {};
        let currentMonth = '';

        for (let c = 0; c < headerRow.length; c++) {
            // Check for Month in the row above, or if it carries over
            if (monthRow && monthRow[c]) {
                const potentialMonth = sanitize(monthRow[c]);
                if (['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].some(m => potentialMonth.includes(m))) {
                    const match = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].find(m => potentialMonth.includes(m));
                    if (match) currentMonth = match;
                }
            }

            const cellVal = sanitize(headerRow[c]);
            if (cellVal.startsWith('WEEK')) {
                const weekNum = parseInt(cellVal.replace('WEEK', ''));
                if (!isNaN(weekNum) && currentMonth) {
                    colMap[c] = { month: currentMonth, week: weekNum };
                }
            }
        }

        // 4. Extract Data
        const nameIdx = headerRow.findIndex((c: any) => sanitize(c).includes('MEMBER NAME'));
        const contactIdx = headerRow.findIndex((c: any) => sanitize(c).includes('CONTACT'));
        const idIdx = headerRow.findIndex((c: any) => sanitize(c).includes('MEMBER ID')); // Legacy support

        for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (nameIdx === -1) continue;

            const rawName = row[nameIdx];
            if (!rawName) continue; // Skip empty rows

            // Generate deterministic ID from name as Member ID is no longer primary
            const memberId = generateId(String(rawName));

            // Get Phone from CONTACT column
            let phone = '0000000000';
            if (contactIdx !== -1 && row[contactIdx]) {
                phone = String(row[contactIdx]);
            } else if (idIdx !== -1 && row[idIdx]) {
                // Fallback to Member ID column if it was being used for something else? 
                // In new format, Member ID IS Contact, so if we found old format ID, it might be the ID.
                // But user instruction says "member ID is now the contact".
                // We'll prioritize CONTACT column.
            }

            // Get YTD if available
            let extractedYtd = 0;
            if (ytdIdx !== -1 && typeof row[ytdIdx] === 'number') {
                extractedYtd = row[ytdIdx];
            }

            // Create Member
            members.push({
                id: memberId,
                name: String(rawName),
                phone: phone,
                fellowship: fellowshipName,
                status: 'ACTIVE',
                ytdTotal: extractedYtd
            });

            // Extract Transactions from this row
            Object.keys(colMap).forEach(colIdxStr => {
                const colIdx = parseInt(colIdxStr);
                const amount = row[colIdx];

                if (typeof amount === 'number' && amount > 0) {
                    const mapping = colMap[colIdx];
                    const timestamp = getSundayDate(parseInt(year), mapping.month, mapping.week);

                    transactions.push({
                        id: `IMP-${memberId}-${timestamp}-${mapping.week}`, // Deterministic ID to avoid duplicates on re-import
                        batchId: `BATCH-IMPORT-${year}`,
                        memberId: memberId,
                        memberName: String(rawName),
                        fellowship: fellowshipName,
                        amount: amount,
                        method: PaymentMethod.CASH, // Default to Cash for Excel import
                        timestamp: timestamp,
                        officerId: 'ADMIN-IMPORT'
                    });
                }
            });
        }
    });

    return { members, transactions, warnings };
};



