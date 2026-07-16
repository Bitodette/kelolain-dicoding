function getStatusFromStock(stock) {
    if (stock <= 0) return 'Habis';
    if (stock <= 5) return 'Menipis';
    return 'Aman';
}

module.exports = { getStatusFromStock };
