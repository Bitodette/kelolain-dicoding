import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { 
    ArrowLeftIcon,
    TrashIcon,
    PencilSquareIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    FunnelIcon
} from "@heroicons/react/24/outline";

import { API_BASE } from '../utils/api';

export default function RiwayatTransaksi() {
    const isIncomeType = (type) => {
        const t = String(type || "").toLowerCase().trim();
        return t === "masuk" || t === "pemasukan" || t === "income";
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
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("Semua");

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

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get(`${API_BASE}/api/transactions`);
            setTransactions(response.data);
        } catch (error) {
            console.error("Gagal mengambil data transaksi", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleDeleteTransaction = async (id, label) => {
        const confirmDelete = window.confirm(`Yakin ingin menghapus riwayat "${label}"?`);
        if (confirmDelete) {
            try {
                await axios.delete(`${API_BASE}/api/transactions/${id}`);
                setTransactions(prev => prev.filter(t => t.id !== id));
            } catch (error) {
                console.error("Gagal menghapus transaksi", error);
                alert("Gagal menghapus transaksi.");
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
            date: formData.date,
        };

        try {
            const res = await axios.put(`${API_BASE}/api/transactions/${editingId}`, payload);
            const updated = res.data;
            setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setIsEditOpen(false);
            setEditingId(null);
        } catch (error) {
            console.error("Gagal memperbarui transaksi", error);
            alert("Gagal memperbarui transaksi.");
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
                                        <td className="px-5 py-4 text-center text-sm text-[#8B95A7] font-medium">{index + 1}</td>
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
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none appearance-none"
                                    >
                                        {formType === "Keluar" ? (
                                            <>
                                                <option value="Restock Barang">Restock Barang</option>
                                                <option value="Operasional">Operasional (Listrik, Air)</option>
                                                <option value="Gaji Karyawan">Gaji Karyawan</option>
                                                <option value="Pengeluaran Lainnya">Lainnya</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Pendapatan Jualan">Pendapatan Jualan</option>
                                                <option value="Suntikan Modal">Suntikan Modal</option>
                                                <option value="Pendapatan Lainnya">Lainnya</option>
                                            </>
                                        )}
                                    </select>
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">Detail Transaksi</h3>
                            <button onClick={() => setIsDetailOpen(false)} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                ✕
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