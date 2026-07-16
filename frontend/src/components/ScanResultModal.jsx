import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from '../utils/api';
import { XMarkIcon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

export default function ScanResultModal({ isOpen, onClose, scannedItems, products, categories, onConfirm, addToast }) {
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
                const { name, category, price } = item.newProductDetails;
                if (!name || !price) {
                    addToast(`Harap lengkapi detail untuk produk baru: "${item.name}"`, 'warning');
                    return;
                }
                try {
                    const selectedCategory = categories.find((cat) => cat.name === category);
                    await axios.post(`${API_BASE}/api/products`, {
                        name,
                        category: category || null,
                        categoryId: selectedCategory?.id ?? null,
                        price: parseInt(price),
                        costPrice: item.price,
                        stock: item.quantity,
                        status: item.quantity > 0 ? (item.quantity <= 5 ? 'Menipis' : 'Aman') : 'Habis'
                    });
                } catch (err) {
                    console.error("Gagal membuat produk baru:", err);
                    addToast(err.response?.data?.error || `Gagal membuat produk baru: ${name}`, 'error');
                    return;
                }
            } else if (item.linkedProductId) {
                const product = products.find(p => p.id === Number(item.linkedProductId));
                if (product) {
                    itemsToProcess.push({ ...item, linkedProduct: product });
                }
            }
        }

        try {
            await onConfirm(itemsToProcess);
        } catch (err) {
            console.error("Gagal memproses hasil scan:", err);
            addToast("Gagal memproses hasil scan.", 'error');
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
                                    <div className="md:col-span-4">
                                        <label className="text-xs font-bold text-gray-500">Item Terdeteksi</label>
                                        <p className="font-semibold text-gray-800 mt-1">{item.name}</p>
                                    </div>

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
