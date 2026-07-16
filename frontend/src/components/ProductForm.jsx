import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function ProductForm({ editingProduct, formData, categoryOptions, onClose, onSubmit, onChange }) {
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            await onSubmit(e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in-up">
                <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                    <h3 className="text-lg font-bold text-[#23262F]">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                    <button onClick={onClose} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                        <XMarkIcon className="w-6 h-6 stroke-[2]" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-[#6B7280]">Nama Produk</label>
                            <input required type="text" name="name" value={formData.name} onChange={onChange} placeholder="Contoh: Beras Sania 5kg" className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-[#6B7280]">Kategori</label>
                            <select name="category" value={formData.category} onChange={onChange} className="w-full px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none appearance-none cursor-pointer">
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
                                <input required type="text" inputMode="numeric" pattern="[0-9]*" name="costPrice" value={formData.costPrice} onChange={onChange} placeholder="0" className="w-full px-3 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-[#6B7280]">Harga Jual</label>
                                <input required type="text" inputMode="numeric" pattern="[0-9]*" name="price" value={formData.price} onChange={onChange} placeholder="0" className="w-full px-3 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-[#6B7280]">Stok Awal</label>
                                <input required type="text" inputMode="numeric" pattern="[0-9]*" name="stock" value={formData.stock} onChange={onChange} placeholder="0" className="w-full px-3 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm font-bold focus:border-[#2936C4] focus:outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-[#E6E8EC] flex items-center justify-end gap-3 bg-gray-50">
                        <button type="button" onClick={onClose} className="btn btn-secondary px-5 py-2.5 text-sm">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="btn btn-primary px-5 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                            {submitting ? 'Menyimpan...' : (editingProduct ? 'Update Produk' : 'Simpan Produk')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
