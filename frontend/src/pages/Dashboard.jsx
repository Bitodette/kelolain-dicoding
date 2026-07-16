import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
    CubeIcon,
    ShoppingCartIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

import { API_BASE } from '../utils/api';
import LoadingSpinner from "../components/LoadingSpinner";

export default function Dashboard() {
    const [chartData, setChartData] = useState([]);
    const [totals, setTotals] = useState({ pemasukan: 0, pengeluaran: 0, keuntunganBersih: 0 });
    const [transactionCount, setTransactionCount] = useState(0);
    const [isFinanceLoading, setIsFinanceLoading] = useState(true);
    const [financeError, setFinanceError] = useState(null);

    const [lowStockItems, setLowStockItems] = useState([]);
    const [isStockLoading, setIsStockLoading] = useState(true);
    const [userName, setUserName] = useState('Faried');
    const [userOrg, setUserOrg] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setIsFinanceLoading(true);
                setIsStockLoading(true);
                setFinanceError(null);

                const res = await axios.get(`${API_BASE}/api/dashboard`);
                const data = res.data;

                const ws = data.weekSummary || {};
                setTotals({ pemasukan: ws.pemasukan || 0, pengeluaran: ws.pengeluaran || 0, keuntunganBersih: ws.keuntunganBersih || 0 });
                setTransactionCount(ws.transactionCount || 0);
                setChartData(
                    (ws.trend || []).map((x) => ({
                        label: x.label,
                        omzet: Number(x.pemasukan) || 0,
                        untung: Number(x.keuntunganBersih) || 0,
                    }))
                );

                setLowStockItems(data.lowStockItems || []);
            } catch (e) {
                console.error("Gagal mengambil data dashboard:", e);
                setFinanceError("Gagal memuat ringkasan bisnis.");
            } finally {
                setIsFinanceLoading(false);
                setIsStockLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    useEffect(() => {
        try {
            const stored = JSON.parse(window.localStorage.getItem('kelolain_auth') || 'null');
            setUserName(stored?.user?.name || stored?.user?.username || 'Faried');
            setUserOrg(stored?.user?.organizationName || '');
        } catch { /* ignore */ }
    }, []);

    // salam berdasarkan jam
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Pagi";
        if (hour >= 12 && hour < 15) return "Siang";
        if (hour >= 15 && hour < 19) return "Sore";
        return "Malam";
    };

    const getCondition = () => {
        return "baik";
    };

    const totalOmzet = totals.pemasukan || 0;
    const totalUntung = totals.keuntunganBersih || 0;
    const totalTransaksi = transactionCount || 0;

    const hasChartData = useMemo(() => {
        if (!Array.isArray(chartData) || chartData.length === 0) return false;
        return chartData.some((x) => (x.omzet || 0) > 0 || (x.untung || 0) !== 0);
    }, [chartData]);

    const formatYAxis = (value) => {
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (abs >= 1000000) return `${sign}${(abs / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
        if (abs >= 1000) return `${sign}${(abs / 1000).toLocaleString("id-ID")}rb`;
        return value;
    };

    const formatTooltipName = (name) => {
        if (name === "omzet") return "Omzet";
        if (name === "untung") return "Keuntungan";
        return name;
    };

    const cleanProfitTextClass = ( totalUntung < 0 ? 
        "mt-1 text-2xl font-bold text-red-600" :
        "mt-1 text-2xl font-bold text-emerald-600"
    );

    return (
        <div className="flex flex-col gap-3 sm:gap-4">
            
            {/* banner*/}
            <div className="bg-white p-5 rounded-xl border-2 border-[#E6E8EC]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-[#6B7280]">Selamat {getGreeting()}, {userName} 👋</p>
                        <p className="text-xl font-bold text-[#23262F] mt-1">Hari ini toko anda berjalan {getCondition()}</p>
                        <p className="text-sm font-normal text-[#6B7280] mt-1">
                            {lowStockItems.length > 0
                                ? `Ada ${lowStockItems.length} stok yang hampir habis.`
                                : 'Semua stok aman saat ini.'}
                        </p>
                    </div>
                    
                    <div className={`${lowStockItems.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} grid w-full gap-3 mt-4 md:mt-0 md:flex md:w-auto`}>
                        <Link to="/kasir" className={`btn btn-success w-full px-8 py-2.5 text-sm sm:text-base text-center ${lowStockItems.length === 0 ? 'md:px-10' : ''}`}>
                            <ShoppingCartIcon className="h-5 w-5" />
                            <span>Kasir</span>
                        </Link>
                        <Link to="/produk" className="btn btn-primary w-full px-4 py-2.5 text-sm sm:text-base text-center">
                            <CubeIcon className="h-5 w-5" />
                            <span>Restock</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* header */}
            <div className="flex flex-row flex-wrap justify-between items-center gap-4 mt-2">
                <div className="min-w-0">
                    <h3 className="text-lg font-bold text-[#23262F] truncate">Ringkasan Bisnis</h3>
                    <p className="text-xs text-[#6B7280]">Performa penjualan dan transaksi untuk minggu ini</p>
                </div>
            </div>

            {/* card stats */}
            <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                    <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white transition-all">
                        <p className="text-sm font-medium text-[#6B7280]">Total Penjualan</p>
                        <p className="mt-2 text-2xl font-bold text-[#23262F]">Rp {totalOmzet.toLocaleString("id-ID")}</p>
                    </div>

                    <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white transition-all">
                        <p className="text-sm font-medium text-[#6B7280]">Keuntungan Bersih</p>
                        <p className={cleanProfitTextClass}>Rp {totalUntung.toLocaleString("id-ID")}</p>
                    </div>
                    
                    <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white transition-all">
                        <p className="text-sm font-medium text-[#6B7280]">Total Transaksi</p>
                        <p className="mt-2 text-2xl font-bold text-[#23262F]">{totalTransaksi.toLocaleString("id-ID")}</p>
                    </div>
                </div>
            </div>

            {/* linechart & low stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                
                {/* linechart card */}
                <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white md:col-span-2 flex flex-col">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <p className="text-base font-semibold text-[#23262F]">Tren Pendapatan</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 min-h-0 w-full">
                            {isFinanceLoading ? (
                                <div className="h-full w-full flex items-center justify-center"><LoadingSpinner text="" /></div>
                            ) : financeError ? (
                                <div className="h-full w-full flex items-center justify-center text-sm text-[#E02D3C]">{financeError}</div>
                            ) : !hasChartData ? (
                                <div className="h-full w-full flex items-center justify-center text-sm text-[#8B95A7]">Belum ada data untuk grafik.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke="#EEF0F3" vertical={false} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8B95A7", fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8B95A7", fontSize: 11 }} width={45} tickFormatter={formatYAxis} domain={[dataMin => Math.min(dataMin, 0), 'auto']} />
                                        <Tooltip
                                            formatter={(value, name) => [`Rp ${Number(value || 0).toLocaleString("id-ID")}`, formatTooltipName(name)]}
                                            labelStyle={{ color: "#23262F", fontWeight: "bold", paddingBottom: "4px" }}
                                            contentStyle={{ borderRadius: "12px", border: "1px solid #E6E8EC", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)", padding: "12px" }}
                                            itemStyle={{ paddingVertical: "2px" }}
                                        />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 15, fontSize: 11 }} />
                                        
                                        <Line type="monotone" dataKey="omzet" name="Omzet" stroke="#6554D8" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={700} animationEasing="ease-out" />
                                        <Line type="monotone" dataKey="untung" name="Keuntungan" stroke="#66D3CC" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={700} animationEasing="ease-out" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* low stock card */}
                <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <p className="text-base font-semibold text-[#23262F]">Stok Menipis</p>
                            <p className="text-xs text-[#6B7280] mt-1">Barang yang perlu dicek ulang</p>
                        </div>
                        <p className="text-xs font-medium bg-[#EEF2FF] text-[#2936C4] px-2 py-1 rounded-md whitespace-nowrap">Analisis AI</p>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full">
                        <ul className="divide-y divide-[#E6E8EC] w-full">
                            {isStockLoading ? (
                                <li className="py-10 flex justify-center"><LoadingSpinner text="" /></li>
                            ) : lowStockItems.length === 0 ? (
                                <li className="py-10 text-center text-sm text-[#8B95A7]">Tidak ada stok menipis.</li>
                            ) : (
                                lowStockItems.map((item) => (
                                <li key={item.id} className="flex items-center justify-between gap-3 py-3.5 w-full first:pt-0 last:pb-0 hover:bg-gray-50 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[#23262F] truncate">{item.name}</p>
                                        <p className="text-xs text-[#6B7280] mt-1">Sisa stok <span className="font-bold text-[#E02D3C]">{item.stock}</span></p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <Link to="/produk" className="text-xs text-[#2936C4] font-medium hover:underline">
                                            Isi ulang
                                        </Link>
                                        <p className="flex items-center gap-1 text-[10px] text-[#8B95A7] mt-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                            <SparklesIcon className="w-3 h-3 text-emerald-500" />
                                            {item.est ? `${item.est} hari` : 'Estimasi belum tersedia'}
                                        </p>
                                    </div>
                                </li>
                                ))
                            )}
                        </ul>
                    </div>

                    <div className="w-full pt-4 mt-2 border-t border-[#E6E8EC]">
                        <Link to="/produk" className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium bg-[#F9FAFB] border border-[#E6E8EC] text-[#23262F] rounded-xl hover:bg-[#F3F4F6] transition-colors">
                            Lihat Semua Stok
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}