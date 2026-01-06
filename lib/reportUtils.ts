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

    const doc = new jsPDF();

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
        doc.addImage(logoUrl, 'PNG', 14, 10, imgWidth, imgHeight);
    } catch (e) {
        console.warn("Could not add logo", e);
    }

    // Titles
    doc.setTextColor(30, 41, 59); // Slate 800

    // "The Tithe Department"
    doc.setFontSize(10);
    doc.setFont(titleFont, 'bold');
    doc.text('The Tithe Department', 105, 18, { align: 'center' });

    // "FINANCIAL REPORT"
    doc.setFontSize(24);
    doc.setFont(titleFont, 'bold');
    doc.text('FINANCIAL REPORT', 105, 28, { align: 'center' });

    // Period Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont(titleFont, 'normal');
    const periodText = `${period.month} ${period.year} ${period.week !== 'All' ? '- Week ' + period.week : '- Monthly Summary'}`;
    doc.text(periodText.toUpperCase(), 105, 36, { align: 'center' });

    // 4. Summary Table
    const tableData = [
        ['Total Collection', `GHS ${total.toLocaleString()}`],
        ['Best Performing Fellowship', best.name.toUpperCase()],
        ['Lowest Performing Fellowship', worst.name.toUpperCase()]
    ];

    autoTable(doc, {
        startY: 50,
        head: [['METRIC', 'VALUE']],
        body: tableData,
        headStyles: {
            fillColor: [0, 0, 0], // Black header
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            minCellHeight: 12,
            font: titleFont // Use Poppins in table header
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 11,
            halign: 'center',
            minCellHeight: 10,
            font: bodyFont // Use Poppins in table body
        },
        columnStyles: {
            0: { cellWidth: 100, halign: 'left' }, // Metric column
            1: { cellWidth: 80, halign: 'center', fontStyle: 'bold' }  // Value column
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
    });

    // 5. Fellowship Chart
    // Draw simplified bar chart at the bottom
    const startY = (doc as any).lastAutoTable.finalY + 25; // Adjusted startY
    const chartHeight = 80;
    const chartWidth = 170; // Reduced slightly for Y-axis labels
    const startX = 25; // Shifted right for Y-axis labels

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont(titleFont, 'bold');
    doc.text('Fellowship Performance (Weekly Breakdown)', 15, startY - 10);

    // Draw Axes
    doc.setDrawColor(200, 200, 200);
    doc.line(startX, startY, startX, startY + chartHeight); // Y Axis
    doc.line(startX, startY + chartHeight, startX + chartWidth, startY + chartHeight); // X Axis

    if (chartData.length > 0) {
        const maxVal = Math.max(...chartData.map(c => c.week1 + c.week2 + c.week3 + c.week4 + c.week5));

        // Y Axis Max (round up to nearest 1000)
        const yMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

        // Draw Y-Axis Grid & Labels (0, 25%, 50%, 75%, 100%)
        const steps = 4;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont(bodyFont, 'normal');

        for (let i = 0; i <= steps; i++) {
            const val = (yMax / steps) * i;
            const yPos = (startY + chartHeight) - ((val / yMax) * chartHeight);

            // Label
            doc.text(`${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`, startX - 2, yPos + 1, { align: 'right' });

            // Grid line (light)
            if (i > 0) { // Don't draw over X axis
                doc.setDrawColor(240, 240, 240);
                doc.line(startX, yPos, startX + chartWidth, yPos);
            }
        }

        const barWidth = 8; // Slightly thinner
        const gap = (chartWidth - (chartData.length * barWidth)) / (chartData.length + 1);

        chartData.forEach((d, i) => {
            const x = startX + gap + (i * (barWidth + gap));
            let currentY = startY + chartHeight;

            const weeks = [d.week1, d.week2, d.week3, d.week4, d.week5];

            weeks.forEach((val, wIdx) => {
                if (val > 0) {
                    const h = (val / yMax) * chartHeight;
                    const color = WEEK_COLORS[wIdx];
                    doc.setFillColor(color[0], color[1], color[2]);
                    // roundedRect(x, y, w, h, rx, ry, style)
                    try {
                        doc.roundedRect(x, currentY - h, barWidth, h, 1, 1, 'F');
                    } catch (e) {
                        // Fallback if roundedRect not supported/fails
                        doc.rect(x, currentY - h, barWidth, h, 'F');
                    }
                    currentY -= h;
                }
            });

            // Label (Fellowship Name) - Staggered
            doc.setFontSize(7);
            doc.setTextColor(80);
            doc.setFont(bodyFont, 'normal');

            const displayName = d.name.length > 8 ? d.name.substring(0, 6) + '..' : d.name;
            doc.text(displayName, x + barWidth / 2, startY + chartHeight + 4 + (i % 2 * 3), { align: 'center' }); // Stagger labels
        });
    }

    // Legend
    const legendY = startY + chartHeight + 15;
    let legendX = startX;
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

    weeks.forEach((w, i) => {
        const color = WEEK_COLORS[i];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(legendX, legendY, 3, 3, 'F');
        doc.setTextColor(100);
        doc.setFontSize(8);
        doc.text(w, legendX + 5, legendY + 2.5);
        legendX += 25;
    });


    // 6. Footer
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on: ${dateStr}`, 15, 290);
    doc.text('The Tithe Department', 195, 290, { align: 'right' });

    // 7. Save
    doc.save(`Financial_Report_${period.year}_${period.month}.pdf`);
};
