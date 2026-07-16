import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_BASE } from '../utils/api';
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import {
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    PencilSquareIcon,
    TrashIcon,
    AdjustmentsHorizontalIcon,
    XMarkIcon,
    ArrowUpOnSquareIcon,
} from "@heroicons/react/24/outline";
import Pagination from "../components/Pagination";
import useReceiptScanner from "../hooks/useReceiptScanner";
import ProductForm from "../components/ProductForm";
import CategoryManager from "../components/CategoryManager";
import RestockModal from "../components/RestockModal";
import ScanPopup from "../components/ScanPopup";
import ScanResultModal from "../components/ScanResultModal";

const EMPTY_FORM = { name: "", category: "", costPrice: "", price: "", stock: "" };

export default function Produk() {
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editingProduct, setEditingProduct] = useState(null);

    const [restockProduct, setRestockProduct] = useState(null);
    const [restockQty, setRestockQty] = useState("");
    const [restockCost, setRestockCost] = useState("");

    const [selectedCategory, setSelectedCategory] = useState("All");
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [categories, setCategories] = useState([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const scanner = useReceiptScanner({ products });

    const fetchProducts = async (p = 1) => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/api/products`, { params: { page: p, limit } });
            if (response.data && Array.isArray(response.data.data)) {
                setProducts(response.data.data);
                setTotalPages(response.data.totalPages || 1);
                setPage(response.data.page || 1);
            } else {
                setProducts(response.data);
                setTotalPages(1);
                setPage(1);
            }
            setError(null);
        } catch (err) {
            console.error("Gagal mengambil data produk:", err);
            setError("Gagal memuat data produk. Pastikan server aktif.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/categories`);
            setCategories(response.data || []);
        } catch (err) {
            console.error("Gagal mengambil kategori:", err);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateCategory = async () => {
        const trimmedName = String(newCategoryName || '').trim();
        if (!trimmedName) return addToast('Nama kategori wajib diisi', 'warning');
        try {
            await axios.post(`${API_BASE}/api/categories`, { name: trimmedName });
            setNewCategoryName('');
            fetchCategories();
            addToast('Kategori berhasil dibuat', 'success');
        } catch (err) {
            addToast(err.response?.data?.error || 'Gagal membuat kategori.', 'error');
        }
    };

    const handleDeleteCategory = async (id) => {
        const confirmed = await confirm('Hapus kategori ini? Produk yang memakai kategori akan tetap tersimpan tetapi kategori akan dilepas.', 'Hapus Kategori');
        if (!confirmed) return;
        try {
            await axios.delete(`${API_BASE}/api/categories/${id}`);
            fetchCategories();
            addToast('Kategori berhasil dihapus', 'success');
        } catch (err) {
            addToast(err.response?.data?.error || 'Gagal menghapus kategori.', 'error');
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        const stockNum = parseInt(formData.stock) || 0;
        let status = "Aman";
        if (stockNum === 0) status = "Habis";
        else if (stockNum <= 5) status = "Menipis";

        const selectedCat = categories.find((cat) => cat.name === formData.category);
        const payload = {
            name: formData.name,
            category: formData.category,
            categoryId: selectedCat?.id ?? null,
            costPrice: parseInt(formData.costPrice) || 0,
            price: parseInt(formData.price) || 0,
            stock: stockNum,
            status
        };

        try {
            if (editingProduct) {
                await axios.put(`${API_BASE}/api/products/${editingProduct.id}`, payload);
            } else {
                await axios.post(`${API_BASE}/api/products`, payload);
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            setFormData(EMPTY_FORM);
            fetchProducts(page);
        } catch (err) {
            addToast(err.response?.data?.error || "Gagal menyimpan data produk.", 'error');
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name || "",
            category: product.category || "",
            costPrice: product.costPrice != null ? String(product.costPrice) : "",
            price: product.price != null ? String(product.price) : "",
            stock: product.stock != null ? String(product.stock) : ""
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, name) => {
        const confirmed = await confirm(`Yakin ingin menghapus produk "${name}"?`, 'Hapus Produk');
        if (!confirmed) return;
        try {
            await axios.delete(`${API_BASE}/api/products/${id}`);
            fetchProducts(page);
            addToast('Produk berhasil dihapus', 'success');
        } catch (err) {
            addToast("Gagal menghapus produk. Silakan coba lagi.", 'error');
        }
    };

    const handleRestock = (product) => {
        setRestockProduct(product);
        setRestockQty("");
        setRestockCost(String(product.costPrice || ""));
    };

    const handleRestockSubmit = async (e) => {
        e.preventDefault();
        if (!restockProduct) return;
        const qty = Number(restockQty);
        const cost = Number(restockCost);
        if (!Number.isFinite(qty) || qty <= 0) return addToast('Jumlah restock harus lebih besar dari 0', 'warning');
        if (!Number.isFinite(cost) || cost < 0) return addToast('Harga modal tidak boleh negatif', 'warning');

        try {
            await axios.post(`${API_BASE}/api/products/${restockProduct.id}/restock`, { quantity: qty, costPrice: cost });
            setRestockProduct(null);
            fetchProducts(page);
            addToast('Restock berhasil', 'success');
        } catch (err) {
            addToast("Gagal restock produk. Coba lagi.", 'error');
        }
    };

    const categoryOptions = categories.map((cat) => cat.name);
    const statuses = ["All", "Aman", "Menipis", "Habis"];

    const filteredProducts = useMemo(() => products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || (product.category === selectedCategory);
        const matchesStatus = selectedStatus === "All" || (product.status === selectedStatus);
        return matchesSearch && matchesCategory && matchesStatus;
    }), [products, searchQuery, selectedCategory, selectedStatus]);

    return (
        <div className="flex flex-col gap-5 sm:gap-6 relative">
            {/* Header banner */}
            <div className="bg-[#F4F5F7] p-4 sm:p-5 rounded-xl border border-[#E6E8EC] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="bg-white p-2 sm:p-3 rounded-xl shadow-sm shrink-0 flex items-center justify-center mt-1 sm:mt-0">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="#23262F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7V4h3" /><path d="M4 17v3h3" /><path d="M20 7V4h-3" /><path d="M20 17v3h-3" />
                            <rect x="7" y="6" width="10" height="12" rx="1" /><path d="M9 10h6" /><path d="M9 14h6" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-lg font-bold text-[#23262F]">Habis belanja stok? Foto struknya aja</h3>
                        <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5 leading-relaxed">Kelola.in baca strukmu, stok & pengeluaran tercatat otomatis.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row w-full xl:w-auto items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 mt-1 xl:mt-0">
                    <input type="file" ref={scanner.fileInputRef} onChange={scanner.handleFileSelect} className="hidden" accept="image/*" capture="environment" />
                    <button onClick={scanner.handleScanClick} disabled={scanner.isExtracting} className="btn btn-primary px-5 py-2.5 text-sm">
                        {scanner.isExtracting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Memproses...
                            </>
                        ) : (
                            <><ArrowUpOnSquareIcon className="w-4 h-4" /> Scan Struk</>
                        )}
                    </button>
                    <button onClick={() => { setEditingProduct(null); setFormData(EMPTY_FORM); setIsModalOpen(true); }} className="btn btn-secondary px-5 py-2.5 text-sm">
                        <PlusIcon className="w-4 h-4" strokeWidth={2.5} /> Tambah Manual
                    </button>
                    <button onClick={() => setIsCategoryModalOpen(true)} className="btn btn-secondary px-5 py-2.5 text-sm">
                        <AdjustmentsHorizontalIcon className="w-4 h-4" /> Kelola Kategori
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="relative w-full md:w-80">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B95A7]" />
                    <input type="text" placeholder="Cari nama produk, kategori..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#E6E8EC] rounded-xl outline-none focus:border-[#2936C4] transition-colors shadow-sm" />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto relative">
                    <div className="relative">
                        <button onClick={() => { setIsCategoryOpen(o => !o); setIsFilterOpen(false); }} className="appearance-none rounded-xl border border-[#E6E8EC] bg-white text-[#6B7280] text-xs font-medium outline-none cursor-pointer transition-colors px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-50">
                            <AdjustmentsHorizontalIcon className="w-4 h-4" />
                            {selectedCategory === 'All' ? 'Kategori' : selectedCategory}
                        </button>
                        {isCategoryOpen && (
                            <div className="absolute mt-2 right-0 w-44 bg-white border border-[#E6E8EC] rounded-xl shadow-lg z-40">
                                <ul className="p-2">
                                    {['All', ...categoryOptions].map((cat) => (
                                        <li key={cat}>
                                            <button onClick={() => { setSelectedCategory(cat); setIsCategoryOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedCategory === cat ? 'bg-[#F1F5F9] font-bold' : 'hover:bg-gray-50'}`}>
                                                {cat}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button onClick={() => { setIsFilterOpen(o => !o); setIsCategoryOpen(false); }} className="appearance-none rounded-xl border border-[#E6E8EC] bg-white text-[#6B7280] text-xs font-medium outline-none cursor-pointer transition-colors px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-50">
                            <FunnelIcon className="w-4 h-4" />
                            {selectedStatus === 'All' ? 'Filter' : selectedStatus}
                        </button>
                        {isFilterOpen && (
                            <div className="absolute mt-2 right-0 w-44 bg-white border border-[#E6E8EC] rounded-xl shadow-lg z-40">
                                <ul className="p-2">
                                    {statuses.map(st => (
                                        <li key={st}>
                                            <button onClick={() => { setSelectedStatus(st); setIsFilterOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedStatus === st ? 'bg-[#F1F5F9] font-bold' : 'hover:bg-gray-50'}`}>
                                                {st}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Product Table */}
            <div className="bg-white border border-[#E6E8EC] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-full">
                        <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E6E8EC] text-[10px] sm:text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                                <th className="px-3 sm:px-4 py-3 w-10 text-center hidden md:table-cell">No</th>
                                <th className="px-4 py-3">Nama Produk</th>
                                <th className="px-4 py-3 hidden md:table-cell">Kategori</th>
                                <th className="px-4 py-3 text-right">Harga Jual & Modal</th>
                                <th className="px-3 py-3 text-center">Stok</th>
                                <th className="px-4 py-3 text-center hidden md:table-cell">Status</th>
                                <th className="px-3 sm:px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {loading ? (
                                <tr><td colSpan="7" className="px-4 py-8 text-center text-[#8B95A7] font-medium">Memuat data produk...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="7" className="px-4 py-8 text-center text-[#E02D3C] font-medium">{error}</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="7" className="px-4 py-8 text-center text-[#8B95A7] font-medium">Tidak ada produk yang ditemukan.</td></tr>
                            ) : (
                                filteredProducts.map((product, index) => (
                                    <tr key={product.id} className="hover:bg-[#F8FAFC] transition-colors group">
                                        <td className="px-4 py-2.5 text-center text-xs font-medium text-[#6B7280] hidden md:table-cell">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs sm:text-sm font-bold text-[#23262F] leading-tight">{product.name}</p>
                                            <div className="flex items-center gap-1.5 mt-2 md:hidden">
                                                <span className="bg-gray-100 text-[#6B7280] px-1.5 py-0.5 rounded-[4px] text-[9px] font-medium whitespace-nowrap">{product.category || '-'}</span>
                                                <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${product.status === "Aman" ? "bg-emerald-50 text-emerald-600" : product.status === "Menipis" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-[#E02D3C]"}`}>
                                                    {product.status || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs font-medium text-[#6B7280] hidden md:table-cell">{product.category || '-'}</td>
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                            <p className="text-xs sm:text-sm font-bold text-[#23262F]">Rp {product.price?.toLocaleString("id-ID") || 0}</p>
                                            <p className="text-[10px] text-[#8B95A7] mt-0.5 font-medium">Modal: Rp {product.costPrice?.toLocaleString("id-ID") || 0}</p>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`inline-block min-w-[28px] text-xs sm:text-sm font-bold py-1 rounded ${product.stock <= 5 ? 'bg-red-50 text-[#E02D3C]' : 'text-[#23262F]'}`}>
                                                {product.stock || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center hidden md:table-cell">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${product.status === "Aman" ? "bg-emerald-50 text-emerald-600" : product.status === "Menipis" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-[#E02D3C]"}`}>
                                                {product.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-col sm:flex-row">
                                                <button onClick={() => handleRestock(product)} className="p-1.5 text-[#1D7A52] bg-emerald-50 hover:bg-[#1D7A52] hover:text-white rounded-md transition-colors" title="Restock Produk">
                                                    <PlusIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleEdit(product)} className="p-1.5 text-[#2936C4] bg-indigo-50 hover:bg-[#2936C4] hover:text-white rounded-md transition-colors" title="Edit Produk">
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 text-[#E02D3C] bg-red-50 hover:bg-[#E02D3C] hover:text-white rounded-md transition-colors" title="Hapus Produk">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchProducts(p)} />
                </div>
            </div>

            {/* Modals */}
            {isModalOpen && (
                <ProductForm
                    editingProduct={editingProduct}
                    formData={formData}
                    categoryOptions={categoryOptions}
                    onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
                    onSubmit={handleAddSubmit}
                    onChange={handleInputChange}
                />
            )}

            {isCategoryModalOpen && (
                <CategoryManager
                    categories={categories}
                    newCategoryName={newCategoryName}
                    onClose={() => setIsCategoryModalOpen(false)}
                    onNameChange={setNewCategoryName}
                    onCreate={handleCreateCategory}
                    onDelete={handleDeleteCategory}
                />
            )}

            {restockProduct && (
                <RestockModal
                    product={restockProduct}
                    qty={restockQty}
                    cost={restockCost}
                    onClose={() => setRestockProduct(null)}
                    onQtyChange={setRestockQty}
                    onCostChange={setRestockCost}
                    onSubmit={handleRestockSubmit}
                />
            )}

            <ScanPopup
                isScanPopupOpen={scanner.isScanPopupOpen}
                selectedReceiptPreview={scanner.selectedReceiptPreview}
                blurStatus={scanner.blurStatus}
                isExtracting={scanner.isExtracting}
                scanError={scanner.scanError}
                isCameraOpen={scanner.isCameraOpen}
                cameraVideoRef={scanner.cameraVideoRef}
                onClose={scanner.closeScanPopup}
                onOpenCamera={scanner.openCamera}
                onTriggerFileUpload={scanner.triggerFileUpload}
                onCapturePhoto={scanner.captureCameraPhoto}
                onCloseCamera={scanner.closeCamera}
                onExtract={scanner.handleExtractReceipt}
                onRetry={() => { scanner.setSelectedReceiptFile(null); scanner.setSelectedReceiptPreview(null); scanner.setBlurStatus(null); scanner.setScanError(null); }}
            />

            <ScanResultModal
                isOpen={scanner.isScanResultModalOpen}
                onClose={() => scanner.setIsScanResultModalOpen(false)}
                scannedItems={scanner.scannedItems}
                products={products}
                categories={categories}
                addToast={addToast}
                onConfirm={async (mappedItems) => {
                    const validItems = mappedItems.filter(item => item.linkedProduct?.id && item.quantity > 0);
                    if (validItems.length === 0) {
                        addToast('Tidak ada item yang perlu di-restock.', 'info');
                        fetchProducts(page);
                        scanner.setIsScanResultModalOpen(false);
                        return;
                    }
                    try {
                        for (const item of validItems) {
                            await axios.post(`${API_BASE}/api/products/${item.linkedProduct.id}/restock`, { quantity: item.quantity, costPrice: item.price });
                        }
                        addToast('Stok berhasil diperbarui.', 'success');
                        fetchProducts(page);
                    } catch (err) {
                        addToast("Pembaruan stok gagal. Cek konsol untuk detail.", 'error');
                    }
                    scanner.setIsScanResultModalOpen(false);
                }}
            />

            {scanner.scanError && (
                <div className="fixed bottom-5 right-5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-4 animate-fade-in-up">
                    <p className="font-bold">Gagal Memindai!</p>
                    <p>{scanner.scanError}</p>
                    <button onClick={() => scanner.setScanError(null)} className="absolute top-1 right-1 text-red-500 hover:text-red-800">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {scanner.isCameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">Ambil Foto Struk</h3>
                            <button onClick={scanner.closeCamera} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <video ref={scanner.cameraVideoRef} autoPlay playsInline className="w-full aspect-[4/3] bg-black rounded-xl" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button onClick={scanner.captureCameraPhoto} className="btn btn-primary px-5 py-2.5 text-sm">Ambil Foto</button>
                                <button onClick={() => scanner.fileInputRef.current?.click()} className="btn btn-secondary px-5 py-2.5 text-sm">Upload Foto</button>
                            </div>
                            <button onClick={scanner.closeCamera} className="btn btn-secondary px-5 py-2.5 text-sm w-full mt-3">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
