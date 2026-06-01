import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from '../utils/api';
import { useToast } from "../components/Toast";
import { 
    MagnifyingGlassIcon, 
    TrashIcon, 
    PlusIcon, 
    MinusIcon,
    BanknotesIcon,
    ShoppingCartIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";

export default function Kasir() {
    const { addToast } = useToast();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);

    // --- FETCH DATA DARI API ---
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

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/categories`);
            setCategories(response.data || []);
        } catch (err) {
            console.error("Gagal mengambil kategori:", err);
        }
    };

    // Filter produk berdasarkan search dan kategori
    const categoryOptions = categories.length > 0
        ? categories.map((cat) => cat.name)
        : Array.from(new Set(products.map((product) => product.category).filter(Boolean)));

    const filteredProducts = products.filter(product => {
        const matchCategory = activeCategory === "Semua" || product.category === activeCategory;
        const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    const addToCart = (product) => {
        const maxStock = Number(product?.stock) || 0;
        if (maxStock <= 0) return;
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if ((Number(existingItem.qty) || 0) >= maxStock) return prevCart;
                return prevCart.map(item => 
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            }
            return [...prevCart, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id, amount) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.id === id) {
                    const currentQty = Number(item.qty) || 0;
                    const maxStock = Number(item.stock) || 0;
                    const requestedQty = currentQty + amount;

                    if (amount > 0 && maxStock > 0) {
                        const cappedQty = Math.min(requestedQty, maxStock);
                        return cappedQty > 0 ? { ...item, qty: cappedQty } : item;
                    }

                    return requestedQty > 0 ? { ...item, qty: requestedQty } : item;
                }
                return item;
            });
        });
    };

    const removeItem = (id) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
        if (cart.length === 1) setIsCartOpenMobile(false);
    };

    const clearCart = () => {
        setCart([]);
        setIsCartOpenMobile(false);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        try {
            // 2. Catat pemasukan ke transaksi
            await axios.post(`${API_BASE}/api/transactions`, {
                label: `Penjualan Kasir (${totalItems} item)`,
                type: "Masuk",
                category: "Pendapatan Jualan",
                amount: total,
                cogs,
                date: new Date().toISOString(),
                items: {
                    subtotal,
                    discount: discountValue,
                    total,
                    cart: cart.map((x) => ({
                        productId: x.id,
                        name: x.name,
                        qty: x.qty,
                        costPrice: x.costPrice,
                        price: x.price,
                        lineTotal: (x.price || 0) * (x.qty || 0),
                    })),
                },
            });

            addToast("Pembayaran berhasil diproses!", 'success');
            clearCart();
            fetchProducts(); // Refresh list agar stok sinkron
        } catch (err) {
            console.error("Gagal memproses pembayaran:", err);
            addToast("Gagal memproses pembayaran, coba lagi.", 'error');
        }
    };

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountValue = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - discountValue);
    const cogs = cart.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.qty) || 0)), 0);

    return (
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full lg:min-h-[calc(100vh-10rem)] relative w-full">
            
            {/* card kiri (daftar produk) */}
            <div className="flex-1 flex flex-col gap-4 w-full min-w-0 max-w-[calc(100vw-32px)] sm:max-w-full">
                
                {/* search */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full min-w-0">
                    <div className="relative w-full sm:flex-1 sm:min-w-0">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B95A7]" />
                        <input 
                            type="text" 
                            placeholder="Cari nama produk..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-white border border-[#E6E8EC] rounded-xl text-sm focus:outline-none focus:border-[#2936C4] transition-colors shadow-sm"
                        />
                    </div>
                </div>

                {/* filter kategori */}
                <div className="relative w-full min-w-0 border-b border-gray-100 mb-1">
                    <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide pr-12 w-full">
                        {['Semua', ...categories.map((cat) => cat.name)].map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                                    activeCategory === category 
                                    ? "bg-[#2936C4] text-white shadow-sm" 
                                    : "bg-white border border-[#E6E8EC] text-[#6B7280] hover:bg-gray-50 shadow-sm"
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                    <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none flex items-center justify-end pr-1 sm:hidden">
                        <ChevronRightIcon className="w-5 h-5 text-[#2936C4] animate-pulse" />
                    </div>
                </div>

                {/* list produk */}
                <div className="bg-white border border-[#E6E8EC] rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden min-w-0 w-full">

                    <div className="overflow-y-auto max-h-[calc(100vh-22rem)] w-full">
                        <div className="sticky top-0 z-10 hidden sm:grid sm:grid-cols-[1fr_80px_120px_48px] items-center bg-[#F8FAFC] border-b border-[#E6E8EC] text-xs font-bold text-[#6B7280] uppercase px-4 py-3 gap-2 w-full">
                            <div>Nama Produk</div>
                            <div className="text-center">Stok</div>
                            <div className="text-right">Harga</div>
                            <div></div>
                        </div>
                        
                        <div className="flex flex-col w-full min-w-0">
                            {loading ? (
                                <div className="py-12 text-center text-[#8B95A7] text-sm font-medium">Memuat data produk...</div>
                            ) : error ? (
                                <div className="py-12 text-center text-[#E02D3C] text-sm font-medium">{error}</div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="py-12 text-center text-[#8B95A7] text-sm flex flex-col items-center gap-2">
                                    <MagnifyingGlassIcon className="w-8 h-8 opacity-50" />
                                    Produk tidak ditemukan.
                                </div>
                            ) : (
                                filteredProducts.map(product => (
                                    <div 
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_120px_48px] items-center gap-2 px-3 sm:px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors group border-b border-[#E6E8EC] last:border-0 w-full min-w-0"
                                    >
                                        {/* nama produk */}
                                        <div className="min-w-0 pr-2 flex flex-col justify-center">
                                            <p className="text-sm font-bold text-[#23262F] group-hover:text-[#2936C4] transition-colors truncate">
                                                {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 min-w-0">
                                                <p className="text-[10px] text-[#8B95A7] font-medium truncate shrink-0">{product.category}</p>
                                                <span className={`sm:hidden text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${product.stock <= 5 ? 'bg-red-50 text-[#E02D3C]' : 'bg-gray-100 text-[#6B7280]'}`}>
                                                    Stok {product.stock}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* stok */}
                                        <div className="hidden sm:block text-center shrink-0">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${product.stock <= 5 ? 'bg-red-50 text-[#E02D3C]' : 'bg-gray-100 text-[#6B7280]'}`}>
                                                {product.stock}
                                            </span>
                                        </div>
                                        
                                        {/* harga */}
                                        <div className="hidden sm:block text-right shrink-0">
                                            <p className="text-sm font-bold text-[#23262F]">Rp {product.price?.toLocaleString("id-ID") || 0}</p>
                                        </div>

                                        {/* tombol add */}
                                        <div className="hidden sm:flex justify-end shrink-0">
                                            <button className="h-7 w-7 rounded-lg bg-gray-100 text-[#8B95A7] group-hover:bg-[#2936C4] group-hover:text-white flex items-center justify-center transition-colors">
                                                <PlusIcon className="w-4 h-4 stroke-[3]" />
                                            </button>
                                        </div>

                                        {/* Harga & Tombol Mobile (KANAN AUTO) */}
                                        <div className="flex sm:hidden items-center justify-end gap-3 shrink-0 pl-1">
                                            <p className="text-sm font-bold text-[#23262F] whitespace-nowrap">
                                                Rp {product.price?.toLocaleString("id-ID") || 0}
                                            </p>
                                            <button className="h-7 w-7 rounded-lg bg-gray-100 text-[#8B95A7] group-hover:bg-[#2936C4] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                                <PlusIcon className="w-4 h-4 stroke-[3]" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* card kanan (cart) */}
            <div className={`
                fixed bottom-0 left-0 right-0 bg-white border-t sm:border border-[#E6E8EC] rounded-t-xl lg:rounded-xl flex flex-col shadow-[0_-15px_40px_rgba(0,0,0,0.1)] lg:shadow-sm transition-transform duration-300 ease-in-out w-full max-w-full
                ${isCartOpenMobile ? "translate-y-0" : "translate-y-[calc(100%-72px)] lg:translate-y-0"}
                lg:static lg:w-[380px] xl:w-[420px] lg:h-[calc(100vh-8rem)] lg:flex
            `}>
                
                {/* floating summary untuk mobile */}
                <div 
                    onClick={() => setIsCartOpenMobile(!isCartOpenMobile)}
                    className="lg:hidden h-[72px] px-4 bg-[#2936C4] rounded-t-2xl flex items-center justify-between text-white cursor-pointer active:bg-indigo-800 shrink-0 w-full"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <ShoppingCartIcon className="w-6 h-6" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#E02D3C] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                                    {totalItems}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] opacity-80 font-medium">Total Pesanan</span>
                            <span className="text-sm font-bold truncate">Rp {total.toLocaleString("id-ID")}</span>
                        </div>
                    </div>
                    {isCartOpenMobile ? <ChevronDownIcon className="w-5 h-5 stroke-[3] shrink-0" /> : <ChevronUpIcon className="w-5 h-5 stroke-[3] shrink-0" />}
                </div>

                <div className="p-4 sm:p-5 border-b border-[#E6E8EC] items-center justify-between hidden lg:flex w-full">
                    <h3 className="font-bold text-[#23262F] text-lg truncate">Pesanan Saat Ini</h3>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-xs font-bold text-[#E02D3C] hover:underline flex items-center gap-1 shrink-0">
                            <TrashIcon className="w-3.5 h-3.5" /> Kosongkan
                        </button>
                    )}
                </div>

                <div className="lg:hidden px-4 py-2.5 border-b border-[#E6E8EC] flex items-center justify-between bg-gray-50 shrink-0 w-full">
                    <span className="text-xs font-bold text-[#23262F]">{totalItems} Item terpilih</span>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-[11px] font-bold text-[#E02D3C] flex items-center gap-1 bg-red-50 px-2 py-1 rounded shrink-0">
                            <TrashIcon className="w-3.5 h-3.5" /> Kosongkan
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-white max-h-[45vh] lg:max-h-full w-full min-w-0">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#8B95A7] space-y-3 py-10 w-full">
                            <ShoppingCartIcon className="w-10 h-10 sm:w-12 sm:h-12 opacity-20" />
                            <p className="text-xs sm:text-sm">Keranjang masih kosong</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-[#E6E8EC] min-w-0 w-full">
                            {cart.map(item => (
                                <li key={item.id} className="p-3 flex items-start gap-2 sm:gap-3 w-full min-w-0">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-xs sm:text-sm font-bold text-[#23262F] truncate">{item.name}</p>
                                        <p className="text-[10px] sm:text-xs text-[#6B7280] mt-0.5">Rp {item.price?.toLocaleString("id-ID") || 0}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <p className="text-xs sm:text-sm font-bold text-[#2936C4] whitespace-nowrap">
                                            Rp {((item.price || 0) * item.qty).toLocaleString("id-ID")}
                                        </p>
                                        <div className="flex items-center gap-2 sm:gap-3 bg-[#F4F5F7] rounded-lg p-0.5 sm:p-1 border border-[#E6E8EC]">
                                            <button onClick={() => item.qty === 1 ? removeItem(item.id) : updateQty(item.id, -1)} className="p-1 sm:p-1.5 hover:bg-white rounded text-[#23262F] transition-colors shadow-sm shrink-0">
                                                <MinusIcon className="w-3 h-3 stroke-[3]" />
                                            </button>
                                            <span className="text-xs font-bold w-3 sm:w-4 text-center shrink-0">{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="p-1 sm:p-1.5 hover:bg-white rounded text-[#23262F] transition-colors shadow-sm shrink-0">
                                                <PlusIcon className="w-3 h-3 stroke-[3]" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="p-4 sm:p-5 bg-[#F8FAFC] border-t border-[#E6E8EC] lg:rounded-b-xl shrink-0 w-full">
                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 hidden lg:block">
                        <div className="flex justify-between text-xs sm:text-sm text-[#6B7280]">
                            <span>Subtotal</span>
                            <span className="font-medium text-[#23262F]">Rp {subtotal.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between items-center gap-3 text-xs sm:text-sm text-[#6B7280]">
                            <span>Diskon</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="0"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                className="w-24 sm:w-32 rounded-xl border border-[#E6E8EC] bg-white px-3 py-2 text-right text-sm font-medium text-[#23262F] focus:outline-none focus:border-[#2936C4]"
                            />
                        </div>
                        <div className="w-full h-px bg-[#E6E8EC] my-2"></div>
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-[#23262F]">Total Bayar</span>
                            <span className="text-xl sm:text-2xl font-black text-[#2936C4] truncate max-w-[200px] text-right">Rp {total.toLocaleString("id-ID")}</span>
                        </div>
                    </div>
                    
                    <button 
                        disabled={cart.length === 0}
                        onClick={handleCheckout}
                        className={`btn ${cart.length === 0 ? "bg-gray-300 cursor-not-allowed text-[#9CA3AF]" : "btn-success"} w-full py-3 sm:py-3.5 text-sm sm:text-base`}
                    >
                        <BanknotesIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                        <span className="truncate">Proses Pembayaran {cart.length > 0 && <span className="lg:hidden">- Rp {total.toLocaleString("id-ID")}</span>}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}