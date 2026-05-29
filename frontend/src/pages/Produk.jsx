import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from '../utils/api';
import { 
    PlusIcon, 
    MagnifyingGlassIcon, 
    FunnelIcon,
    PencilSquareIcon,
    TrashIcon,
    AdjustmentsHorizontalIcon,
    XMarkIcon,
    ArrowUpOnSquareIcon,
    CameraIcon,
    ChevronDownIcon,
    CheckIcon
} from "@heroicons/react/24/outline";

export default function Produk() {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        costPrice: "", // Harga modal
        price: "", // Harga jual
        stock: ""
    });
    const [editingProduct, setEditingProduct] = useState(null);
    const [restockProduct, setRestockProduct] = useState(null);
    const [restockQty, setRestockQty] = useState("");
    const [restockCost, setRestockCost] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [categories, setCategories] = useState([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    // OCR State
    const fileInputRef = useRef(null);
    const cameraVideoRef = useRef(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isScanPopupOpen, setIsScanPopupOpen] = useState(false);
    const [selectedReceiptFile, setSelectedReceiptFile] = useState(null);
    const [selectedReceiptPreview, setSelectedReceiptPreview] = useState(null);
    const [blurStatus, setBlurStatus] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState(null);
    const [scannedItems, setScannedItems] = useState([]);
    const [isScanResultModalOpen, setIsScanResultModalOpen] = useState(false);

    const parseNumberFromText = (text) => {
        const normalized = String(text || '').trim();
        if (!normalized) return 0;

        const digits = normalized.replace(/[^0-9.,]/g, '');
        if (!digits) return 0;

        if (digits.includes(',') && digits.includes('.')) {
            const fixed = digits.replace(/\./g, '').replace(/,/g, '.');
            return Math.round(parseFloat(fixed) || 0);
        }

        if (digits.includes(',') && !digits.includes('.')) {
            return Math.round(parseFloat(digits.replace(/,/g, '.')) || 0);
        }

        if (digits.includes('.') && digits.split('.').pop().length === 3) {
            return parseInt(digits.replace(/\./g, ''), 10) || 0;
        }

        return Math.round(parseFloat(digits) || 0);
    };

    const normalizeOcrItems = (responseData) => {
        const rawItems = Array.isArray(responseData.items)
            ? responseData.items
            : Array.isArray(responseData.result)
                ? responseData.result
                : [];

        return rawItems.map((item) => {
            const name = item.name || item.item_name || item.product_name || item.description || '';
            const priceRaw = item.price || item.price_text || item.harga || item.harga_text || '';
            const quantityRaw = item.quantity || item.qty || item.quantity_text || item.qty_text || '';
            const parsedPrice = parseNumberFromText(priceRaw);
            const parsedQuantity = parseNumberFromText(quantityRaw);
            const unitPrice = parsedQuantity > 0 ? Math.round(parsedPrice / parsedQuantity) : parsedPrice;

            return {
                name,
                price: unitPrice,
                totalPrice: parsedPrice,
                rawPrice: priceRaw,
                quantity: parsedQuantity,
                rawQuantity: quantityRaw,
                raw: item,
            };
        });
    };

    const findMatchingProductId = (itemName) => {
        const normalizedItem = String(itemName || '').trim().toLowerCase();
        if (!normalizedItem) return null;

        const exact = products.find((product) => String(product.name || '').trim().toLowerCase() === normalizedItem);
        if (exact) return exact.id;

        return products.find((product) => {
            const normalizedProduct = String(product.name || '').trim().toLowerCase();
            return normalizedProduct.includes(normalizedItem) || normalizedItem.includes(normalizedProduct);
        })?.id || null;
    };

    const uploadReceiptFile = async (file) => {
        if (!file) return false;

        setIsScanning(true);
        setScanError(null);

        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const response = await axios.post(`${API_BASE}/api/ai/ocr/scan`, formData);

            const items = normalizeOcrItems(response.data || {});

            if (items.length > 0) {
                setScannedItems(items.map(item => ({
                    ...item,
                    id: Math.random().toString(36).substr(2, 9),
                    linkedProductId: findMatchingProductId(item.name),
                    quantity: item.quantity || 0,
                })));
                setIsScanResultModalOpen(true);
                return true;
            }

            setScanError('Tidak ada item yang terdeteksi pada struk.');
            return false;
        } catch (err) {
            console.error("Gagal memindai struk:", err);
            const errorMessage = err.response?.data?.message || 'Gagal memindai struk. Coba lagi.';
            setScanError(errorMessage);
            return false;
        } finally {
            setIsScanning(false);
        }
    };

    const handleScanClick = () => {
        setIsScanPopupOpen(true);
        setScanError(null);
        setSelectedReceiptFile(null);
        setSelectedReceiptPreview(null);
        setBlurStatus(null);
        setIsExtracting(false);
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = null;
        await handleReceiptFile(file);
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const toGrayscale = (pixels) => {
        const gray = new Uint8ClampedArray(pixels.length / 4);
        for (let i = 0, j = 0; i < pixels.length; i += 4, j += 1) {
            gray[j] = Math.round((pixels[i] * 0.299) + (pixels[i + 1] * 0.587) + (pixels[i + 2] * 0.114));
        }
        return gray;
    };

    const estimateSharpness = (gray, width, height) => {
        let sum = 0;
        let count = 0;
        const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];

        for (let y = 1; y < height - 1; y += 1) {
            for (let x = 1; x < width - 1; x += 1) {
                const center = gray[y * width + x];
                let lap = 0;
                let k = 0;
                for (let ky = -1; ky <= 1; ky += 1) {
                    for (let kx = -1; kx <= 1; kx += 1) {
                        const pixel = gray[(y + ky) * width + (x + kx)];
                        lap += pixel * kernel[k];
                        k += 1;
                    }
                }
                sum += lap * lap;
                count += 1;
            }
        }

        return count > 0 ? sum / count : 0;
    };

    const checkImageSharpness = async (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const width = 240;
                const height = Math.round((img.height / img.width) * width);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Tidak dapat memproses gambar.'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const gray = toGrayscale(imageData.data);
                const sharpness = estimateSharpness(gray, width, height);
                URL.revokeObjectURL(url);
                resolve(sharpness);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Gagal memuat gambar.'));
            };
            img.src = url;
        });
    };

    const handleReceiptFile = async (file) => {
        if (selectedReceiptPreview) {
            URL.revokeObjectURL(selectedReceiptPreview);
        }
        setSelectedReceiptFile(file);
        setSelectedReceiptPreview(URL.createObjectURL(file));
        setBlurStatus('checking');
        setIsExtracting(false);
        setScanError(null);

        try {
            const sharpness = await checkImageSharpness(file);
            setBlurStatus(sharpness < 1000 ? 'blurry' : 'sharp');
        } catch (err) {
            console.error('Gagal memeriksa ketajaman gambar:', err);
            setBlurStatus('unknown');
        }
    };

    const handleExtractReceipt = async () => {
        if (!selectedReceiptFile) return;
        setScanError(null);
        setIsExtracting(true);

        try {
            const success = await uploadReceiptFile(selectedReceiptFile);
            if (success) {
                setIsScanPopupOpen(false);
            }
        } catch (err) {
            console.error('Gagal mengekstrak struk:', err);
        } finally {
            setIsExtracting(false);
        }
    };

    const closeScanPopup = () => {
        if (selectedReceiptPreview) {
            URL.revokeObjectURL(selectedReceiptPreview);
        }
        setIsScanPopupOpen(false);
        setSelectedReceiptFile(null);
        setSelectedReceiptPreview(null);
        setBlurStatus(null);
        setIsExtracting(false);
        setScanError(null);
        closeCamera();
    };

    const openCamera = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setScanError('Browser Anda tidak mendukung akses kamera langsung. Silakan gunakan upload gambar.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (cameraVideoRef.current) {
                cameraVideoRef.current.srcObject = stream;
            }
            setCameraStream(stream);
            setIsCameraOpen(true);
        } catch (err) {
            console.error('Gagal membuka kamera:', err);
            setScanError('Tidak dapat mengakses kamera. Pastikan izin kamera diizinkan.');
        }
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        setCameraStream(null);
        setIsCameraOpen(false);
    };

    const captureCameraPhoto = async () => {
        if (!cameraVideoRef.current) return;

        const video = cameraVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
            setScanError('Gagal mengambil gambar dari kamera.');
            return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (!blob) {
            setScanError('Gagal mengambil gambar dari kamera.');
            return;
        }

        const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
        closeCamera();
        await handleReceiptFile(file);
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/api/products`);
            setProducts(response.data);
            setError(null);
        } catch (err) {
            console.error("Gagal mengambil data produk:", err);
            setError("Gagal memuat data produk. Pastikan server aktif.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (cameraVideoRef.current && cameraStream) {
            cameraVideoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/categories`);
            setCategories(response.data || []);
        } catch (err) {
            console.error("Gagal mengambil kategori:", err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateCategory = async () => {
        const trimmedName = String(newCategoryName || '').trim();
        if (!trimmedName) return alert('Nama kategori wajib diisi');

        try {
            await axios.post(`${API_BASE}/api/categories`, { name: trimmedName });
            setNewCategoryName('');
            fetchCategories();
        } catch (err) {
            console.error('Gagal membuat kategori:', err);
            alert(err.response?.data?.error || 'Gagal membuat kategori.');
        }
    };

    const handleDeleteCategory = async (id) => {
        const confirmed = window.confirm('Hapus kategori ini? Produk yang memakai kategori akan tetap tersimpan tetapi kategori akan dilepas.');
        if (!confirmed) return;

        try {
            await axios.delete(`${API_BASE}/api/categories/${id}`);
            fetchCategories();
        } catch (err) {
            console.error('Gagal menghapus kategori:', err);
            alert(err.response?.data?.error || 'Gagal menghapus kategori.');
        }
    };

    const categoryOptions = categories.map((cat) => cat.name);

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        
        const stockNum = parseInt(formData.stock) || 0;
        let status = "Aman";
        if (stockNum === 0) status = "Habis";
        else if (stockNum <= 5) status = "Menipis";

        const selectedCategory = categories.find((cat) => cat.name === formData.category);
        const payload = {
            name: formData.name,
            category: formData.category,
            categoryId: selectedCategory?.id ?? null,
            costPrice: parseInt(formData.costPrice) || 0, // Kirim harga beli
            price: parseInt(formData.price) || 0,
            stock: stockNum,
            status: status
        };

        try {
            if (editingProduct) {
                // Edit existing product
                const response = await axios.put(`${API_BASE}/api/products/${editingProduct.id}`, payload);
                setProducts(prev => prev.map(p => p.id === editingProduct.id ? response.data : p));
            } else {
                // Add new product
                const response = await axios.post(`${API_BASE}/api/products`, payload);
                setProducts(prev => [...prev, response.data]);
            }

            setIsModalOpen(false);
            setEditingProduct(null);
            setFormData({ name: "", category: "", costPrice: "", price: "", stock: "" });
        } catch (err) {
            console.error(editingProduct ? "Gagal mengupdate produk:" : "Gagal menambah produk:", err);
            alert("Gagal menyimpan data produk.");
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
        const confirm = window.confirm(`Yakin ingin menghapus produk "${name}"?`);
        if (confirm) {
            try {
                await axios.delete(`${API_BASE}/api/products/${id}`);
                setProducts(prev => prev.filter(p => p.id !== id));
            } catch (err) {
                console.error("Gagal menghapus produk:", err);
                alert("Gagal menghapus produk. Silakan coba lagi.");
            }
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

        if (!Number.isFinite(qty) || qty <= 0) {
            return alert('Jumlah restock harus lebih besar dari 0');
        }

        if (!Number.isFinite(cost) || cost < 0) {
            return alert('Harga modal valid tidak boleh negatif');
        }

        try {
            const response = await axios.post(`${API_BASE}/api/products/${restockProduct.id}/restock`, {
                quantity: qty,
                costPrice: cost,
            });
            setProducts(prev => prev.map(p => p.id === restockProduct.id ? response.data : p));
            setRestockProduct(null);
            setRestockQty("");
            setRestockCost("");
        } catch (err) {
            console.error("Gagal restock produk:", err);
            alert("Gagal restock produk. Coba lagi.");
        }
    };

    const statuses = ["All", "Aman", "Menipis", "Habis"];

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === "All" || (product.category === selectedCategory);
        const matchesStatus = selectedStatus === "All" || (product.status === selectedStatus);

        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className="flex flex-col gap-5 sm:gap-6 relative">
            
            <div className="bg-[#F4F5F7] p-4 sm:p-5 rounded-xl border border-[#E6E8EC] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="bg-white p-2 sm:p-3 rounded-xl shadow-sm shrink-0 flex items-center justify-center mt-1 sm:mt-0">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="#23262F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7V4h3" />
                            <path d="M4 17v3h3" />
                            <path d="M20 7V4h-3" />
                            <path d="M20 17v3h-3" />
                            <rect x="7" y="6" width="10" height="12" rx="1" />
                            <path d="M9 10h6" />
                            <path d="M9 14h6" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-lg font-bold text-[#23262F]">Habis belanja stok? Foto struknya aja</h3>
                        <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5 leading-relaxed">Kelola.in baca strukmu, stok & pengeluaran tercatat otomatis.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full xl:w-auto items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 mt-1 xl:mt-0">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                    />
                    <button onClick={handleScanClick} disabled={isExtracting} className="btn btn-primary px-5 py-2.5 text-sm">
                        {isExtracting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Memproses...
                            </>
                        ) : (
                            <>
                                <ArrowUpOnSquareIcon className="w-4 h-4" />
                                Scan Struk
                            </>
                        )}
                    </button>
                    <button 
                        onClick={() => { setEditingProduct(null); setFormData({ name: "", category: "", costPrice: "", price: "", stock: "" }); setIsModalOpen(true); }}
                        className="btn btn-secondary px-5 py-2.5 text-sm"
                    >
                        <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
                        Tambah Manual
                    </button>
                    <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="btn btn-secondary px-5 py-2.5 text-sm"
                    >
                        <AdjustmentsHorizontalIcon className="w-4 h-4" />
                        Kelola Kategori
                    </button>
                </div>
            </div>

            {isScanPopupOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#23262F]">Scan & Ekstrak Struk</h3>
                                <p className="text-sm text-[#6B7280] mt-1">Pilih foto atau ambil langsung, lalu cek ketajaman sebelum ekstraksi.</p>
                            </div>
                            <button onClick={closeScanPopup} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {!selectedReceiptPreview ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <button onClick={openCamera} className="btn btn-secondary px-4 py-3 text-sm flex items-center justify-center gap-2">
                                        <CameraIcon className="w-4 h-4" />
                                        Ambil Foto
                                    </button>
                                    <button onClick={triggerFileUpload} className="btn btn-primary px-4 py-3 text-sm flex items-center justify-center gap-2">
                                        <ArrowUpOnSquareIcon className="w-4 h-4" />
                                        Upload Foto
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative rounded-2xl overflow-hidden border border-[#E6E8EC] bg-slate-50">
                                        <img src={selectedReceiptPreview} alt="Preview Struk" className="w-full object-cover" />
                                        <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${blurStatus === 'sharp' ? 'bg-emerald-100 text-emerald-700' : blurStatus === 'blurry' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {blurStatus === 'checking' ? 'Memeriksa...' : blurStatus === 'sharp' ? 'Tajam' : blurStatus === 'blurry' ? 'Buram' : 'Tidak diketahui'}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <button onClick={() => { setSelectedReceiptFile(null); setSelectedReceiptPreview(null); setBlurStatus(null); setScanError(null); }} className="btn btn-secondary px-4 py-3 text-sm">
                                            Coba Lagi
                                        </button>
                                        <button
                                            onClick={handleExtractReceipt}
                                            disabled={!selectedReceiptFile || blurStatus === 'blurry' || blurStatus === 'checking' || isExtracting}
                                            className="btn btn-primary px-4 py-3 text-sm flex items-center justify-center gap-2"
                                        >
                                            {isExtracting ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Ekstrak...
                                                </>
                                            ) : (
                                                'Ekstrak Struk'
                                            )}
                                        </button>
                                    </div>

                                    {blurStatus === 'blurry' && (
                                        <p className="text-sm text-amber-700">Foto struk tampak buram. Silakan ambil ulang atau upload ulang dengan pencahayaan lebih baik.</p>
                                    )}
                                </div>
                            )}

                            {scanError && (
                                <p className="text-sm text-red-600">{scanError}</p>
                            )}

                            {isCameraOpen && (
                                <div className="space-y-3">
                                    <video ref={cameraVideoRef} className="w-full h-72 rounded-2xl bg-black object-cover" autoPlay playsInline muted />
                                    <div className="flex gap-3">
                                        <button onClick={captureCameraPhoto} className="btn btn-primary px-4 py-3 text-sm flex-1">Ambil Foto</button>
                                        <button onClick={closeCamera} className="btn btn-secondary px-4 py-3 text-sm flex-1">Batal</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="relative w-full md:w-80">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B95A7]" />
                    <input 
                        type="text" 
                        placeholder="Cari nama produk, kategori..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#E6E8EC] rounded-xl outline-none focus:border-[#2936C4] transition-colors shadow-sm"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto relative">
                    <div className="relative">
                        <button onClick={() => { setIsCategoryOpen(open => !open); setIsFilterOpen(false); }} className="appearance-none rounded-xl border border-[#E6E8EC] bg-white text-[#6B7280] text-xs font-medium outline-none cursor-pointer transition-colors px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-50">
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
                        <button onClick={() => { setIsFilterOpen(open => !open); setIsCategoryOpen(false); }} className="appearance-none rounded-xl border border-[#E6E8EC] bg-white text-[#6B7280] text-xs font-medium outline-none cursor-pointer transition-colors px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-50">
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
                                        <td className="px-4 py-2.5 text-center text-xs font-medium text-[#6B7280] hidden md:table-cell">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs sm:text-sm font-bold text-[#23262F] leading-tight">{product.name}</p>
                                            <div className="flex items-center gap-1.5 mt-2 md:hidden">
                                                <span className="bg-gray-100 text-[#6B7280] px-1.5 py-0.5 rounded-[4px] text-[9px] font-medium whitespace-nowrap">
                                                    {product.category || '-'}
                                                </span>
                                                <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${
                                                    product.status === "Aman" ? "bg-emerald-50 text-emerald-600" :
                                                    product.status === "Menipis" ? "bg-amber-50 text-amber-600" :
                                                    "bg-red-50 text-[#E02D3C]"
                                                }`}>
                                                    {product.status || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs font-medium text-[#6B7280] hidden md:table-cell">
                                            {product.category || '-'}
                                        </td>
                                        
                                        {/* Kolom Harga yang digabung (Jual & Modal) */}
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
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                                                product.status === "Aman" ? "bg-emerald-50 text-emerald-600" :
                                                product.status === "Menipis" ? "bg-amber-50 text-amber-600" :
                                                "bg-red-50 text-[#E02D3C]"
                                            }`}>
                                                {product.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-col sm:flex-row">
                                                <button onClick={() => handleRestock(product)} className="p-1.5 text-[#1D7A52] bg-emerald-50 hover:bg-[#1D7A52] hover:text-white rounded-md transition-colors" title="Restock Produk">
                                                    <PlusIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                                                </button>
                                                <button onClick={() => handleEdit(product)} className="p-1.5 text-[#2936C4] bg-indigo-50 hover:bg-[#2936C4] hover:text-white rounded-md transition-colors" title="Edit Produk">
                                                    <PencilSquareIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 text-[#E02D3C] bg-red-50 hover:bg-[#E02D3C] hover:text-white rounded-md transition-colors" title="Hapus Produk">
                                                    <TrashIcon className="w-4 h-4 sm:w-4 sm:h-4" />
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

            {/* --- MODAL TAMBAH PRODUK --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in-up">
                        
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="flex flex-col">
                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Nama Produk</label>
                                    <input required type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Contoh: Beras Sania 5kg" className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Kategori</label>
                                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none appearance-none cursor-pointer">
                                        <option value="" disabled>Pilih kategori</option>
                                        {categoryOptions.map((categoryName) => (
                                            <option key={categoryName} value={categoryName}>{categoryName}</option>
                                        ))}
                                        {formData.category && !categoryOptions.includes(formData.category) && (
                                            <option value={formData.category}>{formData.category}</option>
                                        )}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-[#6B7280]">Harga Modal</label>
                                        <input required type="text" inputMode="numeric" pattern="[0-9]*" name="costPrice" value={formData.costPrice} onChange={handleInputChange} placeholder="0" className="w-full px-3 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-[#6B7280]">Harga Jual</label>
                                        <input required type="text" inputMode="numeric" pattern="[0-9]*" name="price" value={formData.price} onChange={handleInputChange} placeholder="0" className="w-full px-3 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-[#6B7280]">Stok Awal</label>
                                        <input required type="text" inputMode="numeric" pattern="[0-9]*" name="stock" value={formData.stock} onChange={handleInputChange} placeholder="0" className="w-full px-3 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-[#E6E8EC] flex items-center justify-end gap-3 bg-gray-50">
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="btn btn-secondary px-5 py-2.5 text-sm">
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
                                    {editingProduct ? 'Update Produk' : 'Simpan Produk'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">Kelola Kategori</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>

                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Nama kategori baru"
                                    className="flex-1 px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none"
                                />
                                <button type="button" onClick={handleCreateCategory} className="btn btn-primary px-4 py-2.5 text-sm">
                                    Tambah
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(categories.length > 0 ? categories : []).map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E6E8EC]">
                                        <span className="text-sm font-medium text-[#23262F]">{cat.name}</span>
                                        <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="text-[#E02D3C] text-sm font-bold hover:underline">
                                            Hapus
                                        </button>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <p className="text-sm text-[#6B7280]">Belum ada kategori. Tambahkan kategori terlebih dahulu.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {restockProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">Restock Produk</h3>
                            <button onClick={() => setRestockProduct(null)} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>

                        <form onSubmit={handleRestockSubmit} className="flex flex-col">
                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Produk</label>
                                    <p className="text-sm font-bold text-[#23262F]">{restockProduct.name}</p>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Jumlah Restock</label>
                                    <input
                                        required
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        name="restockQty"
                                        value={restockQty}
                                        onChange={(e) => setRestockQty(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#6B7280]">Harga Modal Baru</label>
                                    <input
                                        required
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        name="restockCost"
                                        value={restockCost}
                                        onChange={(e) => setRestockCost(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-5 border-t border-[#E6E8EC] flex items-center justify-end gap-3 bg-gray-50">
                                <button type="button" onClick={() => setRestockProduct(null)} className="btn btn-secondary px-5 py-2.5 text-sm">
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-success px-5 py-2.5 text-sm">
                                    Simpan Restock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {scanError && (
                 <div className="fixed bottom-5 right-5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-4 animate-fade-in-up">
                    <p className="font-bold">Gagal Memindai!</p>
                    <p>{scanError}</p>
                    <button onClick={() => setScanError(null)} className="absolute top-1 right-1 text-red-500 hover:text-red-800">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {isCameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                            <h3 className="text-lg font-bold text-[#23262F]">Ambil Foto Struk</h3>
                            <button onClick={closeCamera} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <video ref={cameraVideoRef} autoPlay playsInline className="w-full aspect-[4/3] bg-black rounded-xl" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button onClick={captureCameraPhoto} className="btn btn-primary px-5 py-2.5 text-sm">
                                    Ambil Foto
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary px-5 py-2.5 text-sm">
                                    Upload Foto
                                </button>
                            </div>
                            <button onClick={closeCamera} className="btn btn-secondary px-5 py-2.5 text-sm w-full mt-3">
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isScanResultModalOpen && (
                <ScanResultModal
                    isOpen={isScanResultModalOpen}
                    onClose={() => setIsScanResultModalOpen(false)}
                    scannedItems={scannedItems}
                    products={products}
                    categories={categories}
                    onConfirm={async (mappedItems) => {
                        console.log('Confirmed items:', mappedItems);
                        const firstValidItem = mappedItems.find(item => item.linkedProduct && item.quantity > 0);

                        try {
                            if (!firstValidItem) {
                                alert('Produk berhasil diproses. Tidak ada item valid untuk direstock.');
                                fetchProducts();
                                setIsScanResultModalOpen(false);
                                return;
                            }

                            if (!firstValidItem.linkedProduct?.id) {
                                console.warn('Link product ID tidak tersedia, melewati restock.');
                                alert('Produk berhasil diproses, tetapi stok tidak dapat diperbarui karena data tidak lengkap.');
                                fetchProducts();
                                setIsScanResultModalOpen(false);
                                return;
                            }

                            await axios.post(`${API_BASE}/api/products/${firstValidItem.linkedProduct.id}/restock`, {
                                quantity: firstValidItem.quantity,
                                costPrice: firstValidItem.price, // Assuming price from receipt is cost price
                            });

                            alert('Stok berhasil diperbarui.');
                            fetchProducts(); // Refresh product list
                        } catch (err) {
                            console.error("Gagal memperbarui stok dari hasil scan:", err);
                            alert("Hasil pemrosesan produk sudah tersimpan, tetapi pembaruan stok gagal. Cek konsol untuk detail.");
                        }

                        setIsScanResultModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}


function ScanResultModal({ isOpen, onClose, scannedItems, products, categories, onConfirm }) {
    const [mappedItems, setMappedItems] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setMappedItems(scannedItems.map(item => ({
                ...item,
                id: item.id || Math.random().toString(36).substr(2, 9),
                linkedProductId: item.linkedProductId || null,
                isNewProduct: !item.linkedProductId,
                newProductDetails: {
                    name: item.name,
                    category: '',
                    price: '',
                }
            })));
        }
    }, [isOpen, scannedItems, categories]);

    const handleItemChange = (itemId, field, value) => {
        setMappedItems(currentItems =>
            currentItems.map(item => {
                if (item.id === itemId) {
                    if (field === 'isNewProduct') {
                        return { ...item, isNewProduct: value, linkedProductId: null };
                    }
                    if (field.startsWith('newProductDetails.')) {
                        const detailField = field.split('.')[1];
                        return { ...item, newProductDetails: { ...item.newProductDetails, [detailField]: value } };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    };

    const handleConfirm = async () => {
        const itemsToProcess = [];
        for (const item of mappedItems) {
            if (item.isNewProduct) {
                // Create new product first
                const { name, category, price } = item.newProductDetails;
                if (!name || !price) {
                    alert(`Harap lengkapi detail untuk produk baru: "${item.name}"`);
                    return;
                }
                try {
                    const selectedCategory = categories.find((cat) => cat.name === category);
                    const newProductResponse = await axios.post(`${API_BASE}/api/products`, {
                        name,
                        category: category || null,
                        categoryId: selectedCategory?.id ?? null,
                        price: parseInt(price),
                        costPrice: item.price, // price from receipt should be unit price
                        stock: item.quantity,
                        status: item.quantity > 0 ? (item.quantity <= 5 ? 'Menipis' : 'Aman') : 'Habis'
                    });
                    itemsToProcess.push({
                        ...item,
                        linkedProduct: newProductResponse.data,
                    });
                } catch (err) {
                    console.error("Gagal membuat produk baru:", err);
                    alert(`Gagal membuat produk baru: ${name}`);
                    return;
                }
            } else if (item.linkedProductId) {
                const product = products.find(p => p.id === item.linkedProductId);
                if (product) {
                    itemsToProcess.push({ ...item, linkedProduct: product });
                }
            }
        }

        try {
            await onConfirm(itemsToProcess);
        } catch (err) {
            console.error("Gagal memproses hasil scan:", err);
            alert("Gagal memproses hasil scan. Cek konsol untuk detail.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col animate-fade-in-up max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Hasil Pindai Struk</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-600 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                        <div>Item terdeteksi: <strong>{mappedItems.length}</strong></div>
                        <div>Produk cocok: <strong>{mappedItems.filter(item => item.linkedProductId).length}</strong></div>
                        <div className="text-slate-500">Jika produk sudah ada di daftar, sistem akan mencoba mencocokkan nama secara otomatis.</div>
                    </div>
                    <div className="space-y-4">
                        {mappedItems.map((item) => (
                            <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                    {/* Item Name from OCR */}
                                    <div className="md:col-span-4">
                                        <label className="text-xs font-bold text-gray-500">Item Terdeteksi</label>
                                        <p className="font-semibold text-gray-800 mt-1">{item.name}</p>
                                    </div>

                                    {/* Quantity and Price from OCR */}
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-bold text-gray-500">Jumlah</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                                            className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500">Harga Satuan</label>
                                        <p className="mt-1 px-3 py-2 text-sm font-medium text-gray-700">
                                            Rp {item.price?.toLocaleString('id-ID') || 0}
                                        </p>    
                                    </div>

                                    {/* Link to Product */}
                                    <div className="md:col-span-5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-gray-500">Kaitkan dengan produk</span>
                                            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isNewProduct}
                                                    onChange={(e) => handleItemChange(item.id, 'isNewProduct', e.target.checked)}
                                                    className="sr-only"
                                                />
                                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${item.isNewProduct ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                    {item.isNewProduct && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                                                </span>
                                                Buat produk baru
                                            </label>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1">Centang jika item belum ada di daftar produk.</p>
                                        {!item.isNewProduct ? (
                                            <div className="relative w-full mt-1">
                                                <select
                                                    value={item.linkedProductId || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'linkedProductId', e.target.value)}
                                                    className="appearance-none w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                                                >
                                                    <option value="">Pilih produk...</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            </div>
                                        ) : (
                                            <div className="mt-2 p-3 border border-blue-200 rounded-md bg-blue-50 space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Nama Produk Baru"
                                                    value={item.newProductDetails.name}
                                                    onChange={(e) => handleItemChange(item.id, 'newProductDetails.name', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                                                />
                                                <div className="flex gap-2">
                                                    <div className="relative w-1/2">
                                                        <select
                                                            value={item.newProductDetails.category}
                                                            onChange={(e) => handleItemChange(item.id, 'newProductDetails.category', e.target.value)}
                                                            className="appearance-none w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="">Pilih kategori (opsional)</option>
                                                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                        </select>
                                                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        placeholder="Harga Jual"
                                                        value={item.newProductDetails.price}
                                                        onChange={(e) => handleItemChange(item.id, 'newProductDetails.price', e.target.value)}
                                                        className="w-1/2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
                    <button type="button" onClick={onClose} className="btn btn-secondary px-5 py-2.5 text-sm">
                        Batal
                    </button>
                    <button type="button" onClick={handleConfirm} className="btn btn-primary px-5 py-2.5 text-sm">
                        Konfirmasi & Update Stok
                    </button>
                </div>
            </div>
        </div>
    );
}