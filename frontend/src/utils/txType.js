const INCOME_VARIANTS = ['masuk', 'pemasukan', 'income'];
const EXPENSE_VARIANTS = ['keluar', 'pengeluaran', 'expense'];

export function normalizeType(value) {
    return String(value || '').toLowerCase().trim();
}

export function isIncomeType(type) {
    return INCOME_VARIANTS.includes(normalizeType(type));
}

export function isExpenseType(type) {
    return EXPENSE_VARIANTS.includes(normalizeType(type));
}

export function normalizeTypeForm(type) {
    const t = normalizeType(type);
    if (INCOME_VARIANTS.includes(t)) return 'Masuk';
    if (EXPENSE_VARIANTS.includes(t)) return 'Keluar';
    return type;
}
