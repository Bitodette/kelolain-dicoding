import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function CategoryManager({ categories, newCategoryName, onClose, onNameChange, onCreate, onDelete }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in-up">
                <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8FAFC]">
                    <h3 className="text-lg font-bold text-[#23262F]">Kelola Kategori</h3>
                    <button onClick={onClose} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                        <XMarkIcon className="w-6 h-6 stroke-[2]" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <div className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder="Nama kategori baru"
                            className="flex-1 px-4 py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:border-[#2936C4] focus:outline-none"
                        />
                        <button type="button" onClick={onCreate} className="btn btn-primary px-4 py-2.5 text-sm gap-2">
                            <PlusIcon className="w-4 h-4" strokeWidth={2.5} /> Tambah
                        </button>
                    </div>
                    <div className="space-y-2">
                        {(categories.length > 0 ? categories : []).map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E6E8EC]">
                                <span className="text-sm font-medium text-[#23262F]">{cat.name}</span>
                                <button type="button" onClick={() => onDelete(cat.id)} className="text-[#E02D3C] text-sm font-bold hover:underline flex items-center gap-1">
                                    <TrashIcon className="w-3.5 h-3.5" /> Hapus
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
    );
}
