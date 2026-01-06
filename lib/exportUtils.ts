
import { utils, writeFile } from 'xlsx';
import { Member, Transaction, Fellowship } from '../types';
import { getSundayDate } from './dateUtils'; // We might need this or similar reverse logic

export const exportToExcel = (members: Member[], transactions: Transaction[], year: string) => {
    const workbook = utils.book_new();

    // Months for columns
    const months = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];

    // Iterate over each Fellowship to create a sheet
    Object.values(Fellowship).forEach(fellowship => {
        const fellowshipMembers = members
            .filter(m => m.fellowship === fellowship)
            .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical Sort


        // Prepare Data Structure
        // Row 1: Month Headers (Merged)
        // Row 2: Sub-headers (Name, Contact, Week 1-5..., YTD)

        const headerRow1: any[] = ["", ""]; // Spacer for Name, Contact
        const headerRow2: any[] = ["MEMBER NAME", "CONTACT"];
        const merges: any[] = [];

        let colIndex = 2; // Start after Name, Contact

        months.forEach(month => {
            // Month Header
            headerRow1[colIndex] = month;

            // Merge this month across 5 weeks
            merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 4 } });

            // Week Headers
            for (let w = 1; w <= 5; w++) {
                headerRow2[colIndex] = `WEEK ${w}`;
                colIndex++;
            }
        });

        // Add YTD Header
        headerRow2[colIndex] = "YEAR TO DATE TOTAL";
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 1, c: colIndex } }); // Merge YTD vertically if we want, or just leave it
        // Actually typically YTD doesn't have a month header above it, so we leave row 1 index empty there?
        // Or we can merge row 0 and 1 for YTD. Let's leave row 0 empty for YTD col.

        const wsData: any[][] = [
            headerRow1,
            headerRow2
        ];

        // Populate Member Rows
        fellowshipMembers.forEach(member => {
            const row: any[] = [member.name, member.phone];

            // Calculate column values (Weeks)
            months.forEach((month, mIdx) => {
                for (let w = 1; w <= 5; w++) {
                    // Find transaction for this member, this year, this month, this week
                    // We need to parse transaction timestamps to determine their "Week 1-5" of "Month" identity.
                    // This is tricky because we store absolute dates.

                    // Helper to check if a tx belongs to this Month/Week/Year
                    // For simply sync, we can just sum up amounts that fall into the "Week X of Month Y".
                    // How did we generate the timestamp? getSundayDate(year, month, week).
                    // So we can reconstruct that expected date and match.

                    const expectedDate = getSundayDate(parseInt(year), month, w);
                    // Match by just date string part (YYYY-MM-DD) to compare
                    const expectedDateStr = new Date(expectedDate).toISOString().split('T')[0];

                    const amount = transactions
                        .filter(t => t.memberId === member.id)
                        .filter(t => {
                            // t.timestamp is ISO string
                            return t.timestamp.startsWith(expectedDateStr);
                        })
                        .reduce((sum, t) => sum + t.amount, 0);

                    row.push(amount > 0 ? amount : ""); // Leave empty if 0 for cleaner look? User had 0 in screenshot.
                }
            });

            // Add YTD
            row.push(member.ytdTotal);
            wsData.push(row);
        });

        const sheet = utils.aoa_to_sheet(wsData);
        sheet['!merges'] = merges;

        // Append Sheet
        utils.book_append_sheet(workbook, sheet, fellowship);
    });

    writeFile(workbook, `Tithing_Report_${year}.xlsx`);
};
