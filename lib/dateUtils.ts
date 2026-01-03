export const getSundayDate = (year: number, monthName: string, weekNumber: number): string => {
    const monthIndex = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ].indexOf(monthName.toUpperCase());

    if (monthIndex === -1) return new Date().toISOString(); // Fallback

    const date = new Date(year, monthIndex, 1);

    // Find first Sunday
    while (date.getDay() !== 0) {
        date.setDate(date.getDate() + 1);
    }

    // Add weeks (week 1 is the first Sunday, so add weekNumber - 1 weeks)
    date.setDate(date.getDate() + (weekNumber - 1) * 7);

    return date.toISOString();
};
