import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';

interface ReportStats {
    totalCollection: number;
    bestFellowship: { name: string; amount: number };
    worstFellowship: { name: string; amount: number };
}

interface ChartData {
    name: string;
    week1: number;
    week2: number;
    week3: number;
    week4: number;
    week5: number;
}

const WEEK_COLORS = [
    [59, 130, 246], // W1: #3b82f6
    [16, 185, 129], // W2: #10b981
    [245, 158, 11], // W3: #f59e0b
    [139, 92, 246], // W4: #8b5cf6
    [225, 29, 72]   // W5: #e11d48
];

export const generatePDFReport = async (
    transactions: Transaction[],
    period: { year: string; month: string; week: string },
    chartData: ChartData[],
    logoUrl: string
) => {
    // 1. Calculate Stats
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Group by Fellowship
    const ALL_FELLOWSHIPS = [
        'Thyatira', 'Philippi', 'Laodicea', 'Balance', 'Ephesus',
        'Smyrna', 'Sardis', 'Pergamos', 'Berea', 'Philadelphia'
    ];

    const fellowshipMap: Record<string, number> = {};
    ALL_FELLOWSHIPS.forEach(f => fellowshipMap[f] = 0);

    transactions.forEach(t => {
        const f = t.fellowship;
        if (fellowshipMap[f] !== undefined) {
            fellowshipMap[f] += t.amount;
        } else {
            fellowshipMap[f] = (fellowshipMap[f] || 0) + t.amount;
        }
    });

    const fellowshipArr = Object.entries(fellowshipMap).map(([name, amount]) => ({ name, amount }));

    // Sort descending for Best
    fellowshipArr.sort((a, b) => b.amount - a.amount);

    // Best: Max value
    const maxValStats = fellowshipArr.length > 0 ? fellowshipArr[0].amount : 0;
    const bestNames = fellowshipArr.filter(f => f.amount === maxValStats).map(f => f.name).join(', ');

    // Lowest: Min value
    const minValStats = fellowshipArr.length > 0 ? fellowshipArr[fellowshipArr.length - 1].amount : 0;
    const worstNames = fellowshipArr.filter(f => f.amount === minValStats).map(f => f.name).join(', ');

    const best = { name: bestNames || 'N/A', amount: maxValStats };
    const worst = { name: worstNames || 'N/A', amount: minValStats };

    const isAllWeeks = period.week === 'All';
    const doc = isAllWeeks ? new jsPDF({ orientation: 'landscape' }) : new jsPDF();

    // --- Font Loading (Poppins) ---
    try {
        const loadFont = async (url: string, filename: string) => {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            return new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64data = (reader.result as string).split(',')[1];
                    resolve(base64data);
                };
                reader.readAsDataURL(blob);
            });
        };

        const [regFont, boldFont] = await Promise.all([
            loadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf', 'Poppins-Regular.ttf'),
            loadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf', 'Poppins-Bold.ttf')
        ]);

        doc.addFileToVFS('Poppins-Regular.ttf', regFont);
        doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');

        doc.addFileToVFS('Poppins-Bold.ttf', boldFont);
        doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');

        console.log("Poppins loaded");
    } catch (e) {
        console.warn("Could not load Poppins font, using fallback", e);
    }

    let reportFont = 'helvetica';
    // If we successfully loaded Poppins (checked via a flag or just assume based on try completion? 
    // better to use a flag set inside try).
    // Actually, doc.getFontList() might help, but simpler:
    if (doc.getFontList().Poppins) {
        reportFont = 'Poppins';
    }

    const titleFont = reportFont;
    const bodyFont = reportFont;

    // 3. Header & Logo
    // Logo Top Left
    try {
        const imgProps = doc.getImageProperties(logoUrl);
        const imgWidth = 35;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(logoUrl, 'PNG', 14, 25, imgWidth, imgHeight);
    } catch (e) {
        console.warn("Could not add logo", e);
    }

    // Titles
    doc.setTextColor(30, 41, 59); // Slate 800
    // Center point differs by orientation (landscape=297mm wide, portrait=210mm)
    const centerX = isAllWeeks ? 148.5 : 105;

    // "The Tithe Department"
    doc.setFontSize(10);
    doc.setFont(titleFont, 'bold');
    doc.text('The Tithe Department', centerX, 33, { align: 'center' });

    // "FINANCIAL REPORT"
    doc.setFontSize(24);
    doc.setFont(titleFont, 'bold');
    doc.text('FINANCIAL REPORT', centerX, 43, { align: 'center' });

    // Period Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont(titleFont, 'normal');
    const periodText = `${period.month} ${period.year} ${period.week !== 'All' ? '- Week ' + period.week : '- Monthly Summary'}`;
    doc.text(periodText.toUpperCase(), centerX, 51, { align: 'center' });

    // --- 4. Fellowship Breakdown Table ---
    const fmt = (n: number) =>
        `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (isAllWeeks) {
        // ── ALL WEEKS MODE: one column per week + row total + column totals row ──
        const cdMap: Record<string, ChartData> = {};
        chartData.forEach(cd => { cdMap[cd.name] = cd; });

        // Per-week column totals
        const weekColTotals = [0, 0, 0, 0, 0];
        ALL_FELLOWSHIPS.forEach(f => {
            const cd = cdMap[f];
            if (cd) {
                weekColTotals[0] += cd.week1;
                weekColTotals[1] += cd.week2;
                weekColTotals[2] += cd.week3;
                weekColTotals[3] += cd.week4;
                weekColTotals[4] += cd.week5;
            }
        });

        const head = [['FELLOWSHIP', 'WEEK 1', 'WEEK 2', 'WEEK 3', 'WEEK 4', 'WEEK 5', 'TOTAL']];

        const body: string[][] = ALL_FELLOWSHIPS.map(f => {
            const cd = cdMap[f];
            const w1 = cd ? cd.week1 : 0;
            const w2 = cd ? cd.week2 : 0;
            const w3 = cd ? cd.week3 : 0;
            const w4 = cd ? cd.week4 : 0;
            const w5 = cd ? cd.week5 : 0;
            const rowTotal = w1 + w2 + w3 + w4 + w5;
            return [
                f,
                w1 > 0 ? fmt(w1) : '-',
                w2 > 0 ? fmt(w2) : '-',
                w3 > 0 ? fmt(w3) : '-',
                w4 > 0 ? fmt(w4) : '-',
                w5 > 0 ? fmt(w5) : '-',
                fmt(rowTotal)
            ];
        });

        // Grand totals row
        const grandTotal = weekColTotals.reduce((s, v) => s + v, 0);
        body.push([
            'TOTAL',
            ...weekColTotals.map(v => v > 0 ? fmt(v) : '-'),
            fmt(grandTotal)
        ]);

        autoTable(doc, {
            startY: 65,
            head,
            body,
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                font: titleFont,
                fontSize: 8
            },
            bodyStyles: {
                textColor: [51, 65, 85],
                fontSize: 8,
                halign: 'right',
                font: bodyFont
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
                1: { halign: 'right', cellWidth: 34 },
                2: { halign: 'right', cellWidth: 34 },
                3: { halign: 'right', cellWidth: 34 },
                4: { halign: 'right', cellWidth: 34 },
                5: { halign: 'right', cellWidth: 34 },
                6: { halign: 'right', fontStyle: 'bold', cellWidth: 39, fillColor: [241, 245, 249] }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            theme: 'grid',
            margin: { left: 10, right: 10 },
            didParseCell: (data) => {
                // Bold + dark header style for the grand-totals row
                if (data.row.index === body.length - 1 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [30, 41, 59];
                    data.cell.styles.textColor = [255, 255, 255];
                }
            }
        });

    } else {
        // ── SINGLE WEEK MODE: original 2-column table ────────────────────────────
        const fellowshipTableData = fellowshipArr.map(f => [
            f.name,
            `GHS ${f.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

        // Add Total Row
        fellowshipTableData.push(['TOTAL', `GHS ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);

        autoTable(doc, {
            startY: 65,
            head: [['FELLOWSHIP', 'AMOUNT']],
            body: fellowshipTableData,
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left',
                font: titleFont
            },
            bodyStyles: {
                textColor: [51, 65, 85],
                fontSize: 10,
                halign: 'left',
                font: bodyFont
            },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            foot: [['', '']],
            footStyles: { fillColor: [255, 255, 255] },
            theme: 'grid',
            margin: { left: 15, right: 15 },
            didParseCell: (data) => {
                if (data.row.index === fellowshipTableData.length - 1 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                }
            }
        });
    }

    // --- 5. Summary Stats Table (Second) ---
    const summaryStartY = (doc as any).lastAutoTable.finalY + 10;

    const tableData = [
        ['Best Performing Fellowship', best.name.toUpperCase()],
        ['Lowest Performing Fellowship', worst.name.toUpperCase()]
    ];

    autoTable(doc, {
        startY: summaryStartY,
        head: [['METRIC', 'VALUE']],
        body: tableData,
        headStyles: {
            fillColor: [71, 85, 105], // Slate 600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            minCellHeight: 10,
            font: titleFont
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 10,
            halign: 'center',
            minCellHeight: 10,
            font: bodyFont
        },
        columnStyles: {
            0: { cellWidth: 100, halign: 'left' },
            1: { cellWidth: 80, halign: 'center', fontStyle: 'bold' }
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
    });

    // --- 6. Fellowship Chart (New Page) ---
    doc.addPage();
    const chartStartY = 30; // Top of new page
    const chartHeight = 80;
    const chartWidth = 170;
    const startX = 25;

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont(titleFont, 'bold');
    doc.text('Weekly Trends (Chart)', 15, chartStartY - 10);

    // Draw Axes
    doc.setDrawColor(200, 200, 200);
    doc.line(startX, chartStartY, startX, chartStartY + chartHeight); // Y Axis
    doc.line(startX, chartStartY + chartHeight, startX + chartWidth, chartStartY + chartHeight); // X Axis

    if (chartData.length > 0) {
        const maxVal = Math.max(...chartData.map(c => c.week1 + c.week2 + c.week3 + c.week4 + c.week5));
        const yMax = Math.ceil(maxVal / 1000) * 1000 || 1000;
        const steps = 4;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont(bodyFont, 'normal');

        for (let i = 0; i <= steps; i++) {
            const val = (yMax / steps) * i;
            const yPos = (chartStartY + chartHeight) - ((val / yMax) * chartHeight);
            doc.text(`${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`, startX - 2, yPos + 1, { align: 'right' });
            if (i > 0) {
                doc.setDrawColor(240, 240, 240);
                doc.line(startX, yPos, startX + chartWidth, yPos);
            }
        }

        const barWidth = 8;
        const gap = (chartWidth - (chartData.length * barWidth)) / (chartData.length + 1);

        chartData.forEach((d, i) => {
            const x = startX + gap + (i * (barWidth + gap));
            let currentY = chartStartY + chartHeight;
            const weeks = [d.week1, d.week2, d.week3, d.week4, d.week5];

            weeks.forEach((val, wIdx) => {
                if (val > 0) {
                    const h = (val / yMax) * chartHeight;
                    const color = WEEK_COLORS[wIdx];
                    doc.setFillColor(color[0], color[1], color[2]);
                    // Sharp Edges (rect)
                    doc.rect(x, currentY - h, barWidth, h, 'F');
                    currentY -= h;
                }
            });

            doc.setFontSize(7);
            doc.setTextColor(80);
            doc.setFont(bodyFont, 'normal');
            const displayName = d.name.length > 8 ? d.name.substring(0, 6) + '..' : d.name;
            doc.text(displayName, x + barWidth / 2, chartStartY + chartHeight + 4 + (i % 2 * 3), { align: 'center' });
        });
    }

    // Legend
    const legendY = chartStartY + chartHeight + 15;
    let legendX = startX;
    const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

    weekLabels.forEach((w, i) => {
        const color = WEEK_COLORS[i];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(legendX, legendY, 3, 3, 'F');
        doc.setTextColor(100);
        doc.setFontSize(8);
        doc.text(w, legendX + 5, legendY + 2.5);
        legendX += 25;
    });

    // 7. Footer
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on: ${dateStr}`, 15, 290);
    doc.text('The Tithe Department', 195, 290, { align: 'right' });

    // 7. Save
    const fileName = `Tithe Report (${period.month} ${period.year}${period.week !== 'All' ? ' - Week ' + period.week : ' - Monthly'}).pdf`;
    doc.save(fileName);
};

// ─── Annual Summary Report ────────────────────────────────────────────────────
export const generateAnnualReport = async (
    transactions: Transaction[],
    year: string,
    monthlyTotals: { name: string; total: number }[],
    logoUrl: string
) => {
    const grandTotal = monthlyTotals.reduce((s, m) => s + m.total, 0);
    const doc = new jsPDF();

    // --- Font Loading ---
    try {
        const loadFont = async (url: string) => {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            return new Promise<string>((resolve) => {
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
            });
        };
        const [regFont, boldFont] = await Promise.all([
            loadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf'),
            loadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf')
        ]);
        doc.addFileToVFS('Poppins-Regular.ttf', regFont);
        doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
        doc.addFileToVFS('Poppins-Bold.ttf', boldFont);
        doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
    } catch (e) {
        console.warn('Could not load Poppins font', e);
    }

    const rf = doc.getFontList().Poppins ? 'Poppins' : 'helvetica';

    // --- Logo ---
    try {
        const imgProps = doc.getImageProperties(logoUrl);
        const imgWidth = 35;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(logoUrl, 'PNG', 14, 25, imgWidth, imgHeight);
    } catch (e) { /* ignore */ }

    // --- Header ---
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10); doc.setFont(rf, 'bold');
    doc.text('The Tithe Department', 105, 33, { align: 'center' });
    doc.setFontSize(24); doc.setFont(rf, 'bold');
    doc.text('ANNUAL FINANCIAL REPORT', 105, 43, { align: 'center' });
    doc.setFontSize(12); doc.setTextColor(100, 116, 139); doc.setFont(rf, 'normal');
    doc.text(`FISCAL YEAR ${year}`, 105, 51, { align: 'center' });

    // --- Monthly Totals Table ---
    const tableBody = monthlyTotals.map(m => [
        m.name.toUpperCase(),
        `GHS ${m.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    tableBody.push([
        'GRAND TOTAL',
        `GHS ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
        startY: 65,
        head: [['MONTH', 'AMOUNT COLLECTED']],
        body: tableBody,
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            font: rf,
            halign: 'left'
        },
        bodyStyles: {
            textColor: [51, 65, 85],
            fontSize: 10,
            font: rf,
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        didParseCell: (data) => {
            // Bold grand total row
            if (data.row.index === tableBody.length - 1 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        }
    });

    // --- Footer page 1 ---
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Generated on: ${dateStr}`, 15, 290);
    doc.text('The Tithe Department', 195, 290, { align: 'right' });

    // ── PAGE 2: Monthly Bar Chart ──────────────────────────────────────────────
    doc.addPage();

    doc.setFontSize(14); doc.setTextColor(30, 41, 59); doc.setFont(rf, 'bold');
    doc.text(`Monthly Collection Trends — ${year}`, 15, 20);

    const chartStartY = 35;
    const chartHeight = 100;
    const chartWidth = 170;
    const startX = 28;

    // Axes
    doc.setDrawColor(200, 200, 200);
    doc.line(startX, chartStartY, startX, chartStartY + chartHeight);
    doc.line(startX, chartStartY + chartHeight, startX + chartWidth, chartStartY + chartHeight);

    const maxVal = Math.max(...monthlyTotals.map(m => m.total), 1);
    const yMax = Math.ceil(maxVal / 1000) * 1000 || 1000;
    const steps = 4;

    // Y-axis labels + grid lines
    doc.setFontSize(7); doc.setTextColor(150); doc.setFont(rf, 'normal');
    for (let i = 0; i <= steps; i++) {
        const val = (yMax / steps) * i;
        const yPos = (chartStartY + chartHeight) - ((val / yMax) * chartHeight);
        doc.text(`${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`, startX - 2, yPos + 1, { align: 'right' });
        if (i > 0) {
            doc.setDrawColor(240, 240, 240);
            doc.line(startX, yPos, startX + chartWidth, yPos);
        }
    }

    // Bars
    const MONTH_COLOR: [number, number, number] = [99, 102, 241]; // indigo
    const barWidth = chartWidth / monthlyTotals.length - 2;
    const gap = 2;

    monthlyTotals.forEach((m, i) => {
        const x = startX + i * (barWidth + gap) + gap / 2;

        if (m.total > 0) {
            const h = (m.total / yMax) * chartHeight;
            doc.setFillColor(MONTH_COLOR[0], MONTH_COLOR[1], MONTH_COLOR[2]);
            doc.rect(x, chartStartY + chartHeight - h, barWidth, h, 'F');

            // Amount on top of bar
            const label = m.total >= 1000 ? (m.total / 1000).toFixed(1) + 'k' : m.total.toString();
            doc.setFontSize(5.5);
            doc.setTextColor(30, 41, 59);
            doc.text(label, x + barWidth / 2, chartStartY + chartHeight - h - 2, { align: 'center' });
        }

        // Month label below bar
        doc.setFontSize(6); doc.setTextColor(80); doc.setFont(rf, 'normal');
        doc.text(m.name.substring(0, 3).toUpperCase(), x + barWidth / 2, chartStartY + chartHeight + 5, { align: 'center' });
    });

    // Footer page 2
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Generated on: ${dateStr}`, 15, 290);
    doc.text('The Tithe Department', 195, 290, { align: 'right' });

    doc.save(`Annual Tithe Report (${year}).pdf`);
};

// ─── Fellowship Annual Report ─────────────────────────────────────────────────
// Shows each fellowship's monthly contributions and annual total for a given year.
export const generateFellowshipAnnualReport = async (
    data: { fellowship: string; monthlyTotals: number[]; annualTotal: number }[],
    months: string[],
    year: string,
    logoUrl: string
) => {
    // Rank highest to lowest — applies to both the table and the bar chart
    const sorted = [...data].sort((a, b) => b.annualTotal - a.annualTotal);
    data = sorted;

    const doc = new jsPDF({ orientation: 'landscape' });

    // --- Font Loading ---
    try {
        const loadFont = async (url: string) => {
            const res = await fetch(url);
            const blob = await res.blob();
            const reader = new FileReader();
            return new Promise<string>((resolve) => {
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
            });
        };
        const [reg, bold] = await Promise.all([
            loadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf'),
            loadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf')
        ]);
        doc.addFileToVFS('Poppins-Regular.ttf', reg);
        doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
        doc.addFileToVFS('Poppins-Bold.ttf', bold);
        doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
    } catch { /* fallback to helvetica */ }

    const rf = doc.getFontList().Poppins ? 'Poppins' : 'helvetica';
    const fmt = (n: number) => n > 0
        ? `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '-';

    // --- Logo ---
    try {
        const props = doc.getImageProperties(logoUrl);
        const w = 30; const h = (props.height * w) / props.width;
        doc.addImage(logoUrl, 'PNG', 14, 10, w, h);
    } catch { /* ignore */ }

    // --- Header ---
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9); doc.setFont(rf, 'bold');
    doc.text('The Tithe Department', 148.5, 16, { align: 'center' });
    doc.setFontSize(20); doc.setFont(rf, 'bold');
    doc.text('FELLOWSHIP ANNUAL REPORT', 148.5, 25, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.setFont(rf, 'normal');
    doc.text(`FISCAL YEAR ${year}`, 148.5, 32, { align: 'center' });

    // --- Table ---
    // Columns: Fellowship | Jan | Feb | ... | Dec | Annual Total
    const head = [['FELLOWSHIP', ...months.map(m => m.toUpperCase()), 'ANNUAL TOTAL']];

    const grandMonthlyTotals = months.map((_, idx) =>
        data.reduce((s, d) => s + d.monthlyTotals[idx], 0)
    );
    const grandTotal = data.reduce((s, d) => s + d.annualTotal, 0);

    const body = data.map(d => [
        d.fellowship,
        ...d.monthlyTotals.map(fmt),
        fmt(d.annualTotal)
    ]);

    // Grand total row
    body.push([
        'GRAND TOTAL',
        ...grandMonthlyTotals.map(fmt),
        fmt(grandTotal)
    ]);

    autoTable(doc, {
        startY: 38,
        head,
        body,
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            font: rf,
            fontSize: 7,
            halign: 'center'
        },
        bodyStyles: {
            textColor: [51, 65, 85],
            fontSize: 7,
            font: rf,
            halign: 'right'
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 28 },
            13: { fontStyle: 'bold', fillColor: [241, 245, 249] } // Annual Total col
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        margin: { left: 10, right: 10 },
        didParseCell: (data) => {
            // Bold grand total row
            if (data.row.index === body.length - 1 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        }
    });

    // --- Footer page 1 ---
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Generated on: ${dateStr}`, 10, 205);
    doc.text('The Tithe Department', 287, 205, { align: 'right' });

    // ── PAGE 2: Fellowship Bar Chart by Annual Total ──────────────────────────
    doc.addPage();

    doc.setFontSize(13); doc.setTextColor(30, 41, 59); doc.setFont(rf, 'bold');
    doc.text(`Fellowship Totals — ${year}`, 15, 18);

    const cY = 30; const cH = 110; const cW = 250; const sX = 35;

    // Axes
    doc.setDrawColor(200, 200, 200);
    doc.line(sX, cY, sX, cY + cH);
    doc.line(sX, cY + cH, sX + cW, cY + cH);

    const maxVal = Math.max(...data.map(d => d.annualTotal), 1);
    const yMax = Math.ceil(maxVal / 1000) * 1000 || 1000;
    const steps = 4;

    doc.setFontSize(6); doc.setTextColor(150); doc.setFont(rf, 'normal');
    for (let i = 0; i <= steps; i++) {
        const val = (yMax / steps) * i;
        const yPos = (cY + cH) - ((val / yMax) * cH);
        doc.text(`${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`, sX - 2, yPos + 1, { align: 'right' });
        if (i > 0) {
            doc.setDrawColor(240, 240, 240);
            doc.line(sX, yPos, sX + cW, yPos);
        }
    }

    const BAR_COLORS: [number, number, number][] = [
        [99, 102, 241], [16, 185, 129], [245, 158, 11],
        [239, 68, 68],  [14, 165, 233], [168, 85, 247],
        [249, 115, 22], [20, 184, 166], [236, 72, 153], [132, 204, 22]
    ];

    const bw = cW / data.length - 4;
    data.forEach((d, i) => {
        const x = sX + i * (bw + 4) + 2;
        if (d.annualTotal > 0) {
            const h = (d.annualTotal / yMax) * cH;
            const c = BAR_COLORS[i % BAR_COLORS.length];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(x, cY + cH - h, bw, h, 'F');

            // Value label on top
            const label = d.annualTotal >= 1000 ? (d.annualTotal / 1000).toFixed(1) + 'k' : d.annualTotal.toString();
            doc.setFontSize(5); doc.setTextColor(30, 41, 59);
            doc.text(label, x + bw / 2, cY + cH - h - 2, { align: 'center' });
        }

        // Fellowship name below bar
        doc.setFontSize(6); doc.setTextColor(80); doc.setFont(rf, 'normal');
        const name = d.fellowship.length > 9 ? d.fellowship.substring(0, 8) + '.' : d.fellowship;
        doc.text(name, x + bw / 2, cY + cH + 5, { align: 'center' });
    });

    // Footer page 2
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Generated on: ${dateStr}`, 10, 205);
    doc.text('The Tithe Department', 287, 205, { align: 'right' });

    doc.save(`Fellowship Annual Report (${year}).pdf`);
};
