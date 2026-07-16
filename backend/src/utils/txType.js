const INCOME_VARIANTS = ['masuk', 'pemasukan', 'income'];
const EXPENSE_VARIANTS = ['keluar', 'pengeluaran', 'expense'];

function normalizeType(value) {
    return String(value || '').toLowerCase().trim();
}

function isIncome(t) {
    return INCOME_VARIANTS.includes(normalizeType(t.type));
}

function isExpense(t) {
    return EXPENSE_VARIANTS.includes(normalizeType(t.type));
}

function normalizeTypeWrite(value) {
    const ty = normalizeType(value);
    if (INCOME_VARIANTS.includes(ty)) return 'Masuk';
    if (EXPENSE_VARIANTS.includes(ty)) return 'Keluar';
    return value;
}

module.exports = { normalizeType, isIncome, isExpense, normalizeTypeWrite };
