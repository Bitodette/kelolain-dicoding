import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import { 
    SparklesIcon, 
    ChevronDownIcon, 
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    EyeIcon,
    XMarkIcon,
    BanknotesIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon
} from "@heroicons/react/24/outline";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

const expenseColors = ["#2936C4", "#66D3CC", "#98A81D", "#CBD5E1"];

import { API_BASE } from '../utils/api';

const periodToApi = {
    "Minggu ini": "week",
    "Bulan ini": "month",
    "Tahun ini": "year",
    "Semua": "all",
    "Custom": "custom",
};

const apiToPeriod = {
    week: "Minggu ini",
    month: "Bulan ini",
    year: "Tahun ini",
    all: "Semua",
    custom: "Custom",
};

function formatRangeHint(selectedPeriod, startDate, endDate) {
    if (selectedPeriod !== "Custom") return "";
    if (!startDate || !endDate) return "Pilih tanggal mulai & akhir.";
    return `${startDate} — ${endDate}`;
}

export default function Keuangan() {
    const { addToast } = useToast();
    const { confirm } = useConfirm();
    const [selectedPeriod, setSelectedPeriod] = useState("Bulan ini");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [hasUserPickedPeriod, setHasUserPickedPeriod] = useState(false);
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);
    
    const handlePeriodSelect = (value) => {
        setHasUserPickedPeriod(true);
        setSelectedPeriod(value);
        if (value !== "Custom") {
            setStartDate("");
            setEndDate("");
        }
        setIsPeriodOpen(false);
    };
    
    // --- STATE TRANSAKSI (API) ---
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- STATE KEUANGAN (API) ---
    const [financeTrendData, setFinanceTrendData] = useState([]);
    const [expenseBreakdown, setExpenseBreakdown] = useState([]);
    const [totals, setTotals] = useState({ pemasukan: 0, pengeluaran: 0, keuntunganBersih: 0 });
    const [comparison, setComparison] = useState(null);
    const [availability, setAvailability] = useState({
        week: { count: 0 },
        month: { count: 0 },
        year: { count: 0 },
        all: { count: 0 },
    });
    const [revenuePrediction7Day, setRevenuePrediction7Day] = useState(null);
    const [isRevenuePredictionLoading, setIsRevenuePredictionLoading] = useState(true);
    const [isFinanceLoading, setIsFinanceLoading] = useState(true);
    const [financeError, setFinanceError] = useState(null);

    // --- STATE MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formType, setFormType] = useState("Keluar"); 
    const [formData, setFormData] = useState({
        amount: "",
        category: "Restock Barang",
        label: "",
        date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    });

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailTx, setDetailTx] = useState(null);

    // --- FETCH DATA TRANSAKSI DARI EXPRESS ---
    const fetchTransactions = async ({ start, end } = {}) => {
        try {
            setIsLoading(true);
            const params = { limit: 50 };
            if (start) params.start = start;
            if (end) params.end = end;
            const response = await axios.get(`${API_BASE}/api/transactions`, { params });
            setTransactions(response.data);
        } catch (error) {
            console.error("Gagal mengambil data transaksi", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFinanceOverview = async ({ period, start, end }) => {
        try {
            setIsFinanceLoading(true);
            setFinanceError(null);

            const params = { period };
            if (period === "custom") {
                if (start) params.start = start;
                if (end) params.end = end;
            }

            const response = await axios.get(`${API_BASE}/api/finance/overview`, { params });
            const data = response.data;

            setFinanceTrendData(Array.isArray(data.trend) ? data.trend : []);
            setExpenseBreakdown(Array.isArray(data.expenseBreakdown) ? data.expenseBreakdown : []);
            setTotals(data.totals || { pemasukan: 0, pengeluaran: 0, keuntunganBersih: 0 });
            setComparison(data.comparison || null);
            setAvailability(data.availability || { week: { count: 0 }, month: { count: 0 }, year: { count: 0 }, all: { count: 0 } });

            const effectiveLabel = apiToPeriod[data.effectivePeriod];
            if (effectiveLabel && effectiveLabel !== selectedPeriod) {
                setSelectedPeriod(effectiveLabel);
            }

            // Auto-pick: kalau user belum pilih manual, pilih periode dengan data paling banyak
            if (!hasUserPickedPeriod && data?.availability) {
                const counts = {
                    week: data.availability.week?.count || 0,
                    month: data.availability.month?.count || 0,
                    year: data.availability.year?.count || 0,
                    all: data.availability.all?.count || 0,
                };
                const priority = { month: 0, week: 1, year: 2, all: 3 };
                const best = Object.entries(counts)
                    .filter(([, count]) => count > 0)
                    .sort((a, b) => {
                        if (b[1] !== a[1]) return b[1] - a[1];
                        return (priority[a[0]] ?? 99) - (priority[b[0]] ?? 99);
                    })[0]?.[0];

                const bestLabel = best ? apiToPeriod[best] : null;
                if (bestLabel && (counts[data.effectivePeriod] || 0) === 0 && bestLabel !== selectedPeriod) {
                    setSelectedPeriod(bestLabel);
                }
            }
        } catch (error) {
            console.error("Gagal mengambil overview keuangan", error);
            setFinanceError("Gagal memuat laporan keuangan.");
            setFinanceTrendData([]);
            setExpenseBreakdown([]);
            setTotals({ pemasukan: 0, pengeluaran: 0, keuntunganBersih: 0 });
            setRevenuePrediction7Day(null);
        } finally {
            setIsFinanceLoading(false);
        }
    };

    const fetchRevenuePrediction = async () => {
        try {
            setIsRevenuePredictionLoading(true);
            const response = await axios.get(`${API_BASE}/api/ai/revenue`);
            const revenueResult = Array.isArray(response.data?.result) ? response.data.result : [];
            setRevenuePrediction7Day(revenueResult.length ? revenueResult[revenueResult.length - 1] : null);
        } catch (error) {
            console.error("Gagal mengambil prediksi penghasilan kotor", error);
            setRevenuePrediction7Day(null);
        } finally {
            setIsRevenuePredictionLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        fetchRevenuePrediction();
    }, []);

    useEffect(() => {
        const period = periodToApi[selectedPeriod] || "month";
        const isCustom = selectedPeriod === "Custom";
        const start = isCustom ? startDate : undefined;
        const end = isCustom ? endDate : undefined;

        if (isCustom && (!startDate || !endDate)) {
            setFinanceTrendData([]);
            setExpenseBreakdown([]);
            setTotals({ pemasukan: 0, pengeluaran: 0, keuntunganBersih: 0 });
            setRevenuePrediction7Day(null);
            setFinanceError(null);
            setIsFinanceLoading(false);
            return;
        }

        fetchFinanceOverview({ period, start, end });

        if (isCustom && startDate && endDate) {
            fetchTransactions({ start: startDate, end: endDate });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPeriod, startDate, endDate]);

    // --- SUBMIT TRANSAKSI BARU KE DB ---
    const handleAddTransaction = async (e) => {
        e.preventDefault();
        
        const payload = {
            label: formData.label || (formType === "Masuk" ? "Pendapatan Lainnya" : "Pengeluaran Lainnya"),
            type: formType,
            category: formData.category,
            amount: parseInt(formData.amount) || 0,
            date: formData.date ? new Date(formData.date).toISOString() : undefined
        };

        try {
            if (isEditMode && editingId) {
                await axios.put(`${API_BASE}/api/transactions/${editingId}`, payload);
            } else {
                await axios.post(`${API_BASE}/api/transactions`, payload);
            }
            // Refresh data di UI
            if (selectedPeriod === "Custom" && startDate && endDate) {
                fetchTransactions({ start: startDate, end: endDate });
                fetchFinanceOverview({ period: "custom", start: startDate, end: endDate });
            } else {
                fetchTransactions();
                fetchFinanceOverview({ period: periodToApi[selectedPeriod] || "month" });
            }
            setIsModalOpen(false); // Tutup modal
            setIsEditMode(false);
            setEditingId(null);
            
            // Reset form
            setFormData({
                amount: "",
                category: "Restock Barang",
                label: "",
                date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            });
        } catch (error) {
            console.error("Gagal menyimpan transaksi", error);
            addToast("Terjadi kesalahan saat menyimpan transaksi.", 'error');
        }
    };

    const normalizeTypeForm = (type) => {
        const t = String(type || "").toLowerCase().trim();
        if (t === "pemasukan" || t === "masuk" || t === "income") return "Masuk";
        if (t === "pengeluaran" || t === "keluar" || t === "expense") return "Keluar";
        return type;
    };

    const toDatetimeLocal = (value) => {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
    };

    const canShowDetails = (tx) => {
        const cart = tx?.items?.cart;
        return Array.isArray(cart) && cart.length > 0;
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormType("Keluar");
        setFormData({
            amount: "",
            category: "Restock Barang",
            label: "",
            date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        });
        setIsModalOpen(true);
    };

    const openEditModal = (tx) => {
        setIsEditMode(true);
        setEditingId(tx.id);

        const normalized = normalizeTypeForm(tx.type);
        const typeForForm = normalized === "Masuk" ? "Masuk" : "Keluar";
        const fallbackCategory = typeForForm === "Masuk" ? "Pendapatan Lainnya" : "Pengeluaran Lainnya";

        setFormType(typeForForm);
        setFormData({
            amount: String(tx.amount ?? ""),
            category: tx.category || fallbackCategory,
            label: tx.label || "",
            date: toDatetimeLocal(tx.createdAt || tx.date),
        });
        setIsModalOpen(true);
    };

    const openDetails = (tx) => {
        setDetailTx(tx);
        setIsDetailOpen(true);
    };

    // --- HAPUS TRANSAKSI DARI DB ---
    const handleDeleteTransaction = async (id, label) => {
        const confirmed = await confirm(`Yakin ingin menghapus riwayat "${label}"?`, 'Hapus Transaksi');
        if (confirmed) {
            try {
                await axios.delete(`${API_BASE}/api/transactions/${id}`);
                setTransactions(prev => prev.filter(t => t.id !== id));
                fetchFinanceOverview({
                    period: periodToApi[selectedPeriod] || "month",
                    start: selectedPeriod === "Custom" ? startDate : undefined,
                    end: selectedPeriod === "Custom" ? endDate : undefined,
                });
                addToast('Transaksi berhasil dihapus', 'success');
            } catch (error) {
                console.error("Gagal menghapus transaksi", error);
                addToast("Gagal menghapus transaksi.", 'error');
            }
        }
    };

    // --- FILTER HANDLER ---
    const handleDateChange = (type, value) => {
        setHasUserPickedPeriod(true);
        if (type === "start") setStartDate(value);
        if (type === "end") setEndDate(value);
        if (value !== "") setSelectedPeriod("Custom");
    };

    const handleDropdownChange = (e) => {
        setHasUserPickedPeriod(true);
        const value = e.target.value;
        setSelectedPeriod(value);
        if (value !== "Custom") {
            setStartDate("");
            setEndDate("");
        }
    };

    const totalPemasukan = totals.pemasukan || 0;
    const totalPengeluaran = totals.pengeluaran || 0;
    const keuntunganBersih = totals.keuntunganBersih || 0;
    const prediksiKasAI_7Hari = revenuePrediction7Day;

    const periodLabel = selectedPeriod === "Minggu ini" ? "minggu lalu" : selectedPeriod === "Bulan ini" ? "bulan lalu" : selectedPeriod === "Tahun ini" ? "tahun lalu" : null;

    const currentExpenseBreakdown = useMemo(() => expenseBreakdown, [expenseBreakdown]);

    const hasTrendData = useMemo(() => {
        return Array.isArray(financeTrendData) && financeTrendData.length > 0;
    }, [financeTrendData]);

    const isTrendInsufficient = useMemo(() => {
        return false;
    }, []);

    const formatYAxis = (value) => {
        if (value >= 1000000) return `${(value / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
        if (value >= 1000) return `${(value / 1000).toLocaleString("id-ID")}rb`;
        return value;
    };

    const formatTooltipName = (name) => {
        if (name === "pemasukan") return "Pemasukan";
        if (name === "pengeluaran") return "Pengeluaran";
        return name;
    };

    const isIncomeType = (type) => {
        const t = String(type || "").toLowerCase().trim();
        return t === "masuk" || t === "pemasukan" || t === "income";
    };

    return (
        <div className="flex flex-col gap-4 relative">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl font-bold text-[#23262F]">Laporan Keuangan</h2>
                
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => handleDateChange("start", e.target.value)} 
                            className={`rounded-xl border py-2 px-3 text-xs outline-none cursor-pointer transition-colors ${startDate ? 'border-[#2936C4] bg-indigo-50 text-[#2936C4] font-semibold' : 'border-[#E6E8EC] bg-white text-[#6B7280]'}`}
                            style={{ colorScheme: 'light' }}
                        />
                        <span className="text-[#6B7280]">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => handleDateChange("end", e.target.value)} 
                            className={`rounded-xl border py-2 px-3 text-xs outline-none cursor-pointer transition-colors ${endDate ? 'border-[#2936C4] bg-indigo-50 text-[#2936C4] font-semibold' : 'border-[#E6E8EC] bg-white text-[#6B7280]'}`}
                            style={{ colorScheme: 'light' }}
                        />
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsPeriodOpen((open) => !open)}
                            className={`appearance-none rounded-xl border border-[#E6E8EC] bg-white text-[#6B7280] text-xs font-medium outline-none cursor-pointer transition-colors px-4 py-2 flex items-center justify-between gap-2 min-w-[140px] hover:bg-gray-50`}
                        >
                            <span>{selectedPeriod}</span>
                            <ChevronDownIcon className="h-4 w-4 text-[#6B7280]" />
                        </button>
                        {isPeriodOpen && (
                            <div className="absolute mt-2 sm:right-0 w-44 bg-white border border-[#E6E8EC] rounded-xl shadow-lg z-40">
                                <ul className="p-2">
                                    {['Minggu ini', 'Bulan ini', 'Tahun ini', 'Semua'].map((option) => (
                                        <li key={option}>
                                            <button
                                                type="button"
                                                onClick={() => handlePeriodSelect(option)}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedPeriod === option ? 'bg-[#F1F5F9] font-bold' : 'hover:bg-gray-50'}`}
                                            >
                                                {option}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- KARTU METRIK --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-50">
                            <ArrowTrendingUpIcon className="w-4 h-4 text-[#2936C4]" />
                        </div>
                        <p className="text-xs font-semibold text-[#6B7280]">Pemasukan</p>
                    </div>
                    <p className="text-2xl font-bold text-[#23262F]">Rp {totalPemasukan.toLocaleString("id-ID")}</p>
                    {comparison?.pemasukan?.previous > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                            {comparison.pemasukan.change > 0 ? (
                                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-500" />
                            )}
                            <span className={comparison.pemasukan.change > 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>
                                {Math.abs(comparison.pemasukan.change)}%
                            </span>
                            <span className="text-[#8B95A7]">vs {periodLabel}</span>
                        </div>
                    )}
                </div>

                <div className="p-4 sm:p-5 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-rose-50">
                            <ArrowTrendingDownIcon className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className="text-xs font-semibold text-[#6B7280]">Pengeluaran</p>
                    </div>
                    <p className="text-2xl font-bold text-[#23262F]">Rp {totalPengeluaran.toLocaleString("id-ID")}</p>
                    {comparison?.pengeluaran?.previous > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                            {comparison.pengeluaran.change > 0 ? (
                                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <span className={comparison.pengeluaran.change > 0 ? "font-semibold text-red-500" : "font-semibold text-emerald-600"}>
                                {Math.abs(comparison.pengeluaran.change)}%
                            </span>
                            <span className="text-[#8B95A7]">vs {periodLabel}</span>
                        </div>
                    )}
                </div>

                <div className="p-4 sm:p-5 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-50">
                            <BanknotesIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-xs font-semibold text-[#6B7280]">Keuntungan Bersih</p>
                    </div>
                    <p className={`text-2xl font-bold ${keuntunganBersih < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        Rp {keuntunganBersih.toLocaleString("id-ID")}
                    </p>
                    {comparison?.keuntunganBersih?.previous > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                            {comparison.keuntunganBersih.change > 0 ? (
                                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-500" />
                            )}
                            <span className={comparison.keuntunganBersih.change > 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>
                                {Math.abs(comparison.keuntunganBersih.change)}%
                            </span>
                            <span className="text-[#8B95A7]">vs {periodLabel}</span>
                        </div>
                    )}
                </div>

                <div className="relative overflow-hidden p-4 sm:p-5 border-2 border-[#E6E8EC] rounded-xl bg-gradient-to-br from-[#EEF2FF] to-white flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 z-10">
                        <div className="p-2 rounded-lg bg-indigo-100">
                            <SparklesIcon className="w-4 h-4 text-[#2936C4]" />
                        </div>
                        <p className="text-xs font-bold text-[#2936C4]">Prediksi Penghasilan Kotor</p>
                    </div>
                    <p className="text-2xl font-black text-[#23262F] z-10">
                        {isRevenuePredictionLoading ? (
                            <span className="text-[#8B95A7]">Memuat...</span>
                        ) : prediksiKasAI_7Hari === null ? (
                            <span className="text-[#8B95A7]">—</span>
                        ) : (
                            <>Rp {prediksiKasAI_7Hari.toLocaleString("id-ID")}</>
                        )}
                    </p>
                    <p className="text-[10px] font-medium text-[#8B95A7] z-10 leading-relaxed">
                        {isRevenuePredictionLoading ? "Memuat prediksi AI..." : prediksiKasAI_7Hari === null ? "Prediksi tidak tersedia karena data belum cukup 3 hari." : "Estimasi 7 hari ke depan berdasarkan model AI."}
                    </p>
                    <SparklesIcon className="absolute -bottom-2 -right-2 h-16 w-16 text-[#2936C4] opacity-5 pointer-events-none" />
                </div>
            </div>

            {/* --- GRAFIK & PIE CHART --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                <div className="lg:col-span-2 p-4 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-[#23262F]">Tren Pemasukan & Pengeluaran</p>
                    </div>
                    <div className="h-72 w-full">
                        {isFinanceLoading ? (
                            <div className="h-full w-full flex items-center justify-center text-sm text-[#8B95A7]">Memuat grafik...</div>
                        ) : financeError ? (
                            <div className="h-full w-full flex items-center justify-center text-sm text-[#E02D3C]">{financeError}</div>
                        ) : !hasTrendData || isTrendInsufficient ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-center px-6">
                                <p className="text-sm font-bold text-[#23262F]">Belum cukup data untuk menampilkan tren</p>
                                <p className="text-xs text-[#8B95A7] mt-1">
                                    {selectedPeriod === "Custom" ? formatRangeHint(selectedPeriod, startDate, endDate) : "Coba tambahkan transaksi atau pilih periode lain."}
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart key={selectedPeriod} data={financeTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#EEF0F3" vertical={false} />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8B95A7", fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8B95A7", fontSize: 11 }} width={45} tickFormatter={formatYAxis} />
                                    <Tooltip formatter={(value, name) => [`Rp ${Number(value || 0).toLocaleString("id-ID")}`, formatTooltipName(name)]} contentStyle={{ borderRadius: "12px", border: "1px solid #E6E8EC", fontSize: "12px" }} />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 15, fontSize: 11 }} />
                                    <Line type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#2936C4" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={700} animationEasing="ease-out" />
                                    <Line type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#98A81D" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={700} animationEasing="ease-out" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="p-4 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col">
                    <p className="text-sm font-semibold text-[#23262F] mb-4">Komposisi Pengeluaran</p>
                    <div className="h-52 w-full">
                        {isFinanceLoading ? (
                            <div className="h-full w-full flex items-center justify-center text-sm text-[#8B95A7]">Memuat...</div>
                        ) : currentExpenseBreakdown.length === 0 ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-center px-6">
                                <p className="text-sm font-bold text-[#23262F]">Belum ada data pengeluaran</p>
                                <p className="text-xs text-[#8B95A7] mt-1">Catat pengeluaran untuk melihat komposisi kategori.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={currentExpenseBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none" isAnimationActive={true} animationDuration={700} animationEasing="ease-out">
                                        {currentExpenseBreakdown.map((entry, index) => (
                                            <Cell key={entry.name} fill={expenseColors[index % expenseColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="mt-4 space-y-2">
                        {currentExpenseBreakdown.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between text-[11px] text-[#6B7280]">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: expenseColors[index % expenseColors.length] }} />
                                    <span>{item.name}</span>
                                </div>
                                <span className="font-bold text-[#23262F]">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- TABEL RIWAYAT TRANSAKSI (DYNAMIC DATA DARI API) --- */}
            <div className="p-4 sm:p-5 border-2 border-[#E6E8EC] rounded-xl bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                        <p className="text-base font-semibold text-[#23262F]">Riwayat Transaksi</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">Pemasukan dan pengeluaran terbaru</p>
                    </div>
                    <button 
                        onClick={openAddModal}
                        className="btn btn-primary px-4 py-2 text-sm w-full sm:w-auto"
                    >
                        <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                        Catat Transaksi
                    </button>
                </div>
                
                <div className="overflow-x-auto border border-[#E6E8EC] rounded-xl">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E6E8EC] text-[11px] font-bold text-[#6B7280] uppercase">
                                <th className="px-4 py-3">Aktivitas / Keterangan</th>
                                <th className="px-4 py-3">Jenis</th>
                                <th className="px-4 py-3 text-right">Nominal</th>
                                <th className="px-4 py-3 text-center">Waktu</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {isLoading ? (
                                <tr><td colSpan="5" className="px-4 py-8 text-center text-[#8B95A7]">Memuat riwayat transaksi...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan="5" className="px-4 py-8 text-center text-[#8B95A7]">Belum ada riwayat transaksi.</td></tr>
                            ) : (
                                transactions.slice(0, 5).map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-[#23262F] text-sm">{item.label}</p>
                                            <p className="text-[10px] font-medium text-[#8B95A7] mt-0.5">{item.category}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isIncomeType(item.type) ? "bg-indigo-50 text-[#2936C4]" : "bg-lime-50 text-[#98A81D]"}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-[#23262F] text-sm">
                                            Rp {item.amount.toLocaleString("id-ID")}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-[#8B95A7]">
                                            {new Date(item.createdAt || item.date).toLocaleString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {canShowDetails(item) && (
                                                    <button
                                                        onClick={() => openDetails(item)}
                                                        className="p-1.5 text-[#23262F] bg-gray-100 hover:bg-[#23262F] hover:text-white rounded-md transition-colors"
                                                        title="Lihat detail"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-1.5 text-[#2936C4] bg-indigo-50 hover:bg-[#2936C4] hover:text-white rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                                {/* Tombol Hapus (Terhubung ke API) */}
                                                <button 
                                                    onClick={() => handleDeleteTransaction(item.id, item.label)}
                                                    className="p-1.5 text-[#E02D3C] bg-red-50 hover:bg-[#E02D3C] hover:text-white rounded-md transition-colors" title="Hapus"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-4 flex justify-center pb-2">
                    <Link to="/keuangan/riwayat" className="px-5 py-2 text-sm font-semibold text-[#2936C4] bg-[#EEF2FF] hover:bg-[#E0E7FF] transition-colors rounded-xl">
                        Lihat Semua Riwayat Transaksi
                    </Link>
                </div>
            </div>

            {/* --- MODAL POP-UP CATAT TRANSAKSI (DYNAMIC SUBMIT) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in-up">
                        
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">{isEditMode ? "Edit Transaksi" : "Catat Transaksi Manual"}</h3>
                            <button onClick={() => { setIsModalOpen(false); setIsEditMode(false); setEditingId(null); }} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>

                        <form onSubmit={handleAddTransaction}>
                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex bg-[#F4F5F7] p-1 rounded-xl">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setFormType("Keluar");
                                            setFormData(prev => ({...prev, category: "Restock Barang"}));
                                        }}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formType === "Keluar" ? "bg-white text-[#E02D3C] shadow-sm" : "text-[#8B95A7]"}`}
                                    >
                                        Pengeluaran
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setFormType("Masuk");
                                            setFormData(prev => ({...prev, category: "Pendapatan Jualan"}));
                                        }}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formType === "Masuk" ? "bg-white text-[#2936C4] shadow-sm" : "text-[#8B95A7]"}`}
                                    >
                                        Pemasukan
                                    </button>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Nominal (Rp)</label>
                                    <input required type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="Contoh: 150000" className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Kategori</label>
                                    {(() => {
                                        const presetKeluar = ["Restock Barang", "Operasional", "Gaji Karyawan", "Transportasi", "Promosi & Iklan", "Sewa Tempat", "Pengeluaran Lainnya"];
                                        const presetMasuk = ["Pendapatan Jualan", "Suntikan Modal", "Pendapatan Lainnya"];
                                        const presets = formType === "Keluar" ? presetKeluar : presetMasuk;
                                        const isPreset = presets.includes(formData.category);

                                        return isPreset ? (
                                            <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none appearance-none">
                                                {presets.map((cat) => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                                <option value="__custom__">Kustom...</option>
                                            </select>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={formData.category === "__custom__" ? "" : formData.category}
                                                    onChange={(e) => setFormData({...formData, category: e.target.value || "__custom__"})}
                                                    placeholder="Tulis kategori baru..."
                                                    className="flex-1 px-4 py-2.5 bg-white border border-[#2936C4] rounded-xl text-sm focus:outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({...formData, category: formType === "Keluar" ? "Restock Barang" : "Pendapatan Jualan"})}
                                                    className="text-xs font-semibold text-[#6B7280] hover:text-[#23262F] whitespace-nowrap"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Keterangan / Catatan</label>
                                    <input required type="text" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} placeholder="Contoh: Bayar listrik bulan Mei" className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Tanggal & Waktu Transaksi</label>
                                    <input required type="datetime-local" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none text-[#23262F]" />
                                </div>
                            </div>

                            <div className="p-5 border-t border-[#E6E8EC] flex items-center justify-end gap-3 bg-gray-50">
                                <button type="button" onClick={() => { setIsModalOpen(false); setIsEditMode(false); setEditingId(null); }} className="btn btn-secondary px-5 py-2.5 text-sm">
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detail (Penjualan Kasir) */}
            {isDetailOpen && detailTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">Detail Transaksi</h3>
                            <button onClick={() => setIsDetailOpen(false)} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-sm font-bold text-[#23262F]">{detailTx.label}</p>
                                <p className="text-xs text-[#8B95A7] mt-1">
                                    {new Date(detailTx.createdAt || detailTx.date).toLocaleString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl border border-[#E6E8EC]">
                                    <p className="text-[11px] font-bold text-[#6B7280]">Jenis</p>
                                    <p className="text-sm font-bold text-[#23262F]">{detailTx.type}</p>
                                </div>
                                <div className="p-3 rounded-xl border border-[#E6E8EC]">
                                    <p className="text-[11px] font-bold text-[#6B7280]">Nominal</p>
                                    <p className="text-sm font-bold text-[#23262F]">Rp {Number(detailTx.amount || 0).toLocaleString("id-ID")}</p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl border border-[#E6E8EC]">
                                <p className="text-[11px] font-bold text-[#6B7280]">Kategori</p>
                                <p className="text-sm font-bold text-[#23262F]">{detailTx.category}</p>
                            </div>

                            {canShowDetails(detailTx) && (
                                <div className="rounded-xl border border-[#E6E8EC] overflow-hidden">
                                    <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E6E8EC]">
                                        <p className="text-sm font-bold text-[#23262F]">Rincian Item</p>
                                    </div>
                                    <div className="p-4">
                                        <div className="space-y-2">
                                            {detailTx.items.cart.map((x, idx) => {
                                                const lineTotal = Number(x.lineTotal ?? (Number(x.price || 0) * Number(x.qty || 0)));
                                                return (
                                                    <div key={`${x.productId ?? x.name}-${idx}`} className="flex items-center justify-between text-sm">
                                                        <div className="min-w-0 pr-2">
                                                            <p className="font-bold text-[#23262F] truncate">{x.name}</p>
                                                            <p className="text-[11px] text-[#8B95A7]">{x.qty} x Rp {Number(x.price || 0).toLocaleString("id-ID")}</p>
                                                        </div>
                                                        <p className="font-bold text-[#23262F] whitespace-nowrap">Rp {lineTotal.toLocaleString("id-ID")}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-[#E6E8EC] space-y-1.5 text-sm">
                                            {(detailTx.items.subtotal !== undefined || Array.isArray(detailTx.items.cart)) && (
                                                <div className="flex justify-between text-[#6B7280]">
                                                    <span>Subtotal</span>
                                                    <span className="font-bold text-[#23262F]">
                                                        Rp {Number(
                                                            detailTx.items.subtotal !== undefined
                                                                ? detailTx.items.subtotal
                                                                : detailTx.items.cart.reduce((sum, item) => {
                                                                    const line = Number(item.lineTotal ?? (Number(item.price || 0) * Number(item.qty || 0)));
                                                                    return sum + line;
                                                                  }, 0)
                                                        ).toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                            )}
                                            {detailTx.items.discount !== undefined && Number(detailTx.items.discount) > 0 && (
                                                <div className="flex justify-between text-[#6B7280]">
                                                    <span>Diskon</span>
                                                    <span className="font-bold text-[#23262F]">Rp {Number(detailTx.items.discount || 0).toLocaleString("id-ID")}</span>
                                                </div>
                                            )}
                                            {(detailTx.items.total !== undefined || Array.isArray(detailTx.items.cart)) && (
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-[#23262F]">Total</span>
                                                    <span className="font-black text-[#23262F]">
                                                        Rp {Number(
                                                            detailTx.items.total !== undefined
                                                                ? detailTx.items.total
                                                                : detailTx.items.cart.reduce((sum, item) => {
                                                                    const line = Number(item.lineTotal ?? (Number(item.price || 0) * Number(item.qty || 0)));
                                                                    return sum + line;
                                                                  }, 0)
                                                        ).toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-[#E6E8EC] flex items-center justify-end bg-gray-50">
                            <button onClick={() => setIsDetailOpen(false)} className="px-5 py-2.5 text-sm font-bold text-[#6B7280] hover:text-[#23262F] transition-colors">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}