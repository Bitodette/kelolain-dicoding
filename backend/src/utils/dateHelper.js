function parseLocalDateOnly(yyyyMmDd) {
    const match = /^\d{4}-\d{2}-\d{2}$/.exec(String(yyyyMmDd || ''));
    if (!match) return null;
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatIdShortDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = date.getDate();
    const m = months[date.getMonth()];
    return `${d} ${m}`;
}

function formatIdMonth(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[date.getMonth()];
}

function getWeekRange(now = new Date()) {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: startOfDay(monday), end: endOfDay(sunday) };
}

function getMonthRange(now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: startOfDay(start), end: endOfDay(end) };
}

function getYearRange(now = new Date()) {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start: startOfDay(start), end: endOfDay(end) };
}

module.exports = {
    parseLocalDateOnly,
    startOfDay,
    endOfDay,
    formatIdShortDate,
    formatIdMonth,
    getWeekRange,
    getMonthRange,
    getYearRange
};