import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import { 
    TrashIcon,
    PencilSquareIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    FunnelIcon
} from "@heroicons/react/24/outline";

import { API_BASE } from '../utils/api';
import { normalizeTypeForm, isIncomeType } from '../utils/txType';
import Pagination from "../components/Pagination";

export default function RiwayatTransaksi() {
    const { addToast } = useToast();
    const { confirm } = useConfirm();
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
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("Semua");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formType, setFormType] = useState("Keluar");
    const [formData, setFormData] = useState({
        amount: "",
        category: "Restock Barang",
        label: "",
        date: toDatetimeLocal(new Date()),
    });

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailTx, setDetailTx] = useState(null);

    const fetchTransactions = async (p = 1) => {
        try {
            setIsLoading(true);
            if (searchQuery || filterType !== "Semua") {
                const response = await axios.get(`${API_BASE}/api/transactions`);
                setTransactions(response.data);
                setTotalPages(1);
                setPage(1);
            } else {
                const response = await axios.get(`${API_BASE}/api/transactions`, { params: { page: p, limit: 20 } });
                if (response.data && Array.isArray(response.data.data)) {
                    setTransactions(response.data.data);
                    setTotalPages(response.data.totalPages || 1);
                    setPage(response.data.page || 1);
                } else {
                    setTransactions(response.data);
                    setTotalPages(1);
                    setPage(1);
                }
            }
        } catch (error) {
            console.error("Gagal mengambil data transaksi", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions(page);
    }, []);

    useEffect(() => {
        fetchTransactions(1);
    }, [searchQuery, filterType]);

    const handleDeleteTransaction = async (id, label) => {
        const confirmed = await confirm(`Yakin ingin menghapus riwayat "${label}"?`, 'Hapus Transaksi');
        if (confirmed) {
            try {
                await axios.delete(`${API_BASE}/api/transactions/${id}`);
                fetchTransactions(page);
                addToast('Transaksi berhasil dihapus', 'success');
            } catch (error) {
                console.error("Gagal menghapus transaksi", error);
                addToast("Gagal menghapus transaksi.", 'error');
            }
        }
    };

    const openEdit = (tx) => {
        setEditingId(tx.id);
        const normalized = normalizeTypeForm(tx.type);
        setFormType(normalized === "Masuk" ? "Masuk" : "Keluar");
        setFormData({
            amount: String(tx.amount ?? ""),
            category: tx.category || (normalized === "Masuk" ? "Pendapatan Lainnya" : "Pengeluaran Lainnya"),
            label: tx.label || "",
            date: toDatetimeLocal(tx.createdAt || tx.date),
        });
        setIsEditOpen(true);
    };

    const handleUpdateTransaction = async (e) => {
        e.preventDefault();
        if (!editingId) return;

        const payload = {
            label: formData.label,
            type: formType,
            category: formData.category,
            amount: parseInt(formData.amount, 10) || 0,
            date: formData.date ? new Date(formData.date).toISOString() : undefined,
        };

        try {
            await axios.put(`${API_BASE}/api/transactions/${editingId}`, payload);
            setIsEditOpen(false);
            setEditingId(null);
            fetchTransactions(page);
        } catch (error) {
            console.error("Gagal memperbarui transaksi", error);
            addToast("Gagal memperbarui transaksi.", 'error');
        }
    };

    const openDetails = (tx) => {
        setDetailTx(tx);
        setIsDetailOpen(true);
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              t.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "Semua" || t.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="flex flex-col gap-4 sm:gap-6 relative min-h-[calc(100vh-8rem)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-80">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B95A7]" />
                    <input 
                        type="text" 
                        placeholder="Cari transaksi..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:outline-none focus:border-[#2936C4] transition-colors shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full appearance-none px-4 py-2 pl-10 bg-white border border-[#E6E8EC] rounded-xl text-sm font-medium text-[#23262F] hover:bg-gray-50 focus:outline-none focus:border-[#2936C4] transition-colors shadow-sm cursor-pointer"
                        >
                            <option value="Semua">Semua Jenis</option>
                            <option value="Masuk">Pemasukan (Masuk)</option>
                            <option value="Keluar">Pengeluaran (Keluar)</option>
                        </select>
                        <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A7]" />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-[#E6E8EC] rounded-xl overflow-hidden shadow-sm flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E6E8EC] text-[11px] font-bold text-[#6B7280] uppercase">
                                <th className="px-5 py-4 w-16 text-center">No</th>
                                <th className="px-5 py-4">Aktivitas / Keterangan</th>
                                <th className="px-5 py-4">Jenis</th>
                                <th className="px-5 py-4 text-right">Nominal</th>
                                <th className="px-5 py-4 text-center">Waktu</th>
                                <th className="px-5 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-4 py-12 text-center text-[#8B95A7]">Memuat riwayat transaksi...</td></tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr><td colSpan="6" className="px-4 py-12 text-center text-[#8B95A7]">Tidak ada transaksi yang cocok.</td></tr>
                            ) : (
                                filteredTransactions.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-5 py-4 text-center text-sm text-[#8B95A7] font-medium">{(page - 1) * 20 + index + 1}</td>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-[#23262F] text-sm">{item.label}</p>
                                            <p className="text-xs font-medium text-[#8B95A7] mt-1">{item.category}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isIncomeType(item.type) ? "bg-indigo-50 text-[#2936C4]" : "bg-lime-50 text-[#98A81D]"}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-[#23262F] text-sm">
                                            Rp {item.amount.toLocaleString("id-ID")}
                                        </td>
                                        <td className="px-5 py-4 text-center text-xs font-medium text-[#8B95A7]">
                                            {new Date(item.createdAt || item.date).toLocaleString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </td>
                                        <td className="px-5 py-4 text-center">
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
                                                    onClick={() => openEdit(item)}
                                                    className="p-1.5 text-[#2936C4] bg-indigo-50 hover:bg-[#2936C4] hover:text-white rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
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
                {!searchQuery && filterType === "Semua" && (
                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchTransactions(p)} />
                )}
            </div>

            {/* Modal Edit */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">Edit Transaksi</h3>
                            <button onClick={() => setIsEditOpen(false)} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTransaction}>
                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex bg-[#F4F5F7] p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormType("Keluar");
                                            setFormData((prev) => ({ ...prev, category: prev.category || "Restock Barang" }));
                                        }}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formType === "Keluar" ? "bg-white text-[#E02D3C] shadow-sm" : "text-[#8B95A7]"}`}
                                    >
                                        Pengeluaran
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormType("Masuk");
                                            setFormData((prev) => ({ ...prev, category: prev.category || "Pendapatan Jualan" }));
                                        }}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formType === "Masuk" ? "bg-white text-[#2936C4] shadow-sm" : "text-[#8B95A7]"}`}
                                    >
                                        Pemasukan
                                    </button>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Nominal (Rp)</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Kategori</label>
                                    {(() => {
                                        const presetKeluar = ["Restock Barang", "Operasional", "Gaji Karyawan", "Transportasi", "Promosi & Iklan", "Sewa Tempat", "Pengeluaran Lainnya"];
                                        const presetMasuk = ["Pendapatan Jualan", "Suntikan Modal", "Pendapatan Lainnya"];
                                        const presets = formType === "Keluar" ? presetKeluar : presetMasuk;
                                        const isPreset = presets.includes(formData.category);

                                        return isPreset ? (
                                            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none appearance-none">
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
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value || "__custom__" })}
                                                    placeholder="Tulis kategori baru..."
                                                    className="flex-1 px-4 py-2.5 bg-white border border-[#2936C4] rounded-xl text-sm focus:outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, category: formType === "Keluar" ? "Restock Barang" : "Pendapatan Jualan" }))}
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
                                    <input
                                        required
                                        type="text"
                                        value={formData.label}
                                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Tanggal & Waktu Transaksi</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none text-[#23262F]"
                                    />
                                </div>
                            </div>

                            <div className="p-5 border-t border-[#E6E8EC] flex items-center justify-end gap-3 bg-gray-50">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 text-sm font-bold text-[#6B7280] hover:text-[#23262F] transition-colors">
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2.5 bg-[#2936C4] hover:bg-[#232EA8] text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC] flex-shrink-0">
                            <h3 className="text-lg font-bold text-[#23262F]">Detail Transaksi</h3>
                            <button onClick={() => setIsDetailOpen(false)} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto">
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
                                            {detailTx.items.cart.map((x, idx) => (
                                                <div key={`${x.productId ?? x.name}-${idx}`} className="flex items-center justify-between text-sm">
                                                    <div className="min-w-0 pr-2">
                                                        <p className="font-bold text-[#23262F] truncate">{x.name}</p>
                                                        <p className="text-[11px] text-[#8B95A7]">{x.qty} x Rp {Number(x.price || 0).toLocaleString("id-ID")}</p>
                                                    </div>
                                                    <p className="font-bold text-[#23262F] whitespace-nowrap">Rp {Number(x.lineTotal || 0).toLocaleString("id-ID")}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-[#E6E8EC] space-y-1.5 text-sm">
                                            {detailTx.items.subtotal !== undefined && (
                                                <div className="flex justify-between text-[#6B7280]">
                                                    <span>Subtotal</span>
                                                    <span className="font-bold text-[#23262F]">Rp {Number(detailTx.items.subtotal || 0).toLocaleString("id-ID")}</span>
                                                </div>
                                            )}
                                            {detailTx.items.discount !== undefined && Number(detailTx.items.discount) > 0 && (
                                                <div className="flex justify-between text-[#6B7280]">
                                                    <span>Diskon</span>
                                                    <span className="font-bold text-[#23262F]">Rp {Number(detailTx.items.discount || 0).toLocaleString("id-ID")}</span>
                                                </div>
                                            )}
                                            {detailTx.items.total !== undefined && (
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-[#23262F]">Total</span>
                                                    <span className="font-black text-[#23262F]">Rp {Number(detailTx.items.total || 0).toLocaleString("id-ID")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-[#E6E8EC] flex items-center justify-end bg-gray-50 flex-shrink-0">
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