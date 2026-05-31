import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    ArrowTrendingUpIcon,
    ShoppingBagIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import { API_BASE } from '../utils/api';

const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export default function Insight() {
    const [loading, setLoading] = useState({ revenue: true, demand: true, bundling: true });
    const [error, setError] = useState(null);
    const [revenueForecast, setRevenueForecast] = useState([]);
    const [demandTop5, setDemandTop5] = useState([]);
    const [bundlingSuggestions, setBundlingSuggestions] = useState([]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchRevenue = axios.get(`${API_BASE}/api/ai/revenue`, { signal: controller.signal })
            .then((res) => {
                setRevenueForecast(Array.isArray(res.data?.result) ? res.data.result : []);
                setLoading((prev) => ({ ...prev, revenue: false }));
            })
            .catch((err) => {
                if (!axios.isCancel(err)) {
                    console.error("Error revenue:", err);
                    setLoading((prev) => ({ ...prev, revenue: false }));
                }
            });

        const fetchDemand = axios.get(`${API_BASE}/api/ai/demand`, { signal: controller.signal })
            .then((res) => {
                setDemandTop5(Array.isArray(res.data?.result) ? res.data.result : []);
                setLoading((prev) => ({ ...prev, demand: false }));
            })
            .catch((err) => {
                if (!axios.isCancel(err)) {
                    console.error("Error demand:", err);
                    setLoading((prev) => ({ ...prev, demand: false }));
                }
            });

        const fetchBundling = axios.get(`${API_BASE}/api/ai/bundling`, { signal: controller.signal })
            .then((res) => {
                setBundlingSuggestions(Array.isArray(res.data?.result) ? res.data.result : []);
                setLoading((prev) => ({ ...prev, bundling: false }));
            })
            .catch((err) => {
                if (!axios.isCancel(err)) {
                    console.error("Error bundling:", err);
                    setLoading((prev) => ({ ...prev, bundling: false }));
                }
            });

        Promise.allSettled([fetchRevenue, fetchDemand, fetchBundling]).then((results) => {
            const allFailed = results.every((r) => r.status === 'rejected');
            if (allFailed) {
                setError("Gagal memuat insight AI. Coba refresh kembali.");
            }
        });

        return () => controller.abort();
    }, []);

    const validRevenueForecast = revenueForecast.filter((value) => {
        const numberValue = Number(value);
        return value !== null && value !== undefined && !Number.isNaN(numberValue);
    });
    const hasRevenueForecastData = validRevenueForecast.length >= 3 && validRevenueForecast.some((value) => Number(value) !== 0);
    const lastRevenue = hasRevenueForecastData ? validRevenueForecast[validRevenueForecast.length - 1] : null;
    const topRisk = demandTop5.length > 0 ? demandTop5[0] : null;
    const shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const revenueChartData = hasRevenueForecastData
        ? validRevenueForecast.map((value, index) => {
              const d = new Date();
              d.setDate(d.getDate() + index);
              return {
                  hari: shortDays[d.getDay()],
                  omzet: Number(value) || 0,
              };
          })
        : [];

    const bundlingRows = useMemo(
        () => bundlingSuggestions.map((text, index) => ({ id: index, suggestion: text })),
        [bundlingSuggestions]
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-5 border-2 border-emerald-100 rounded-xl bg-emerald-50/50 flex flex-col transition-all hover:shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-emerald-800">Prediksi Penghasilan Kotor 7 Hari</p>
                        <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                            {loading.revenue
                                ? 'Memuat prediksi...'
                                : !hasRevenueForecastData
                                    ? 'Perlu minimal data 3 hari untuk menampilkan prediksi revenue.'
                                    : lastRevenue !== null
                                        ? `Estimasi akhir 7 hari: ${formatCurrency(lastRevenue)}.`
                                        : 'Belum ada data prediksi revenue tersedia.'}
                        </p>
                    </div>
                </div>

                <div className="p-5 border-2 border-indigo-100 rounded-xl bg-indigo-50/50 flex flex-col transition-all hover:shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <ShoppingBagIcon className="h-6 w-6 text-[#2936C4]" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-indigo-800">Rekomendasi Bundling</p>
                        <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                            {loading.bundling
                                ? 'Memuat bundling...'
                                : bundlingSuggestions.length > 0
                                    ? `Ditemukan ${bundlingSuggestions.length} rekomendasi bundling.`
                                    : 'Belum ada rekomendasi bundling saat ini.'}
                        </p>
                    </div>
                </div>

                <div className="p-5 border-2 border-amber-100 rounded-xl bg-amber-50/50 flex flex-col transition-all hover:shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-800">Produk Berisiko Habis</p>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                            {loading.demand
                                ? 'Memuat prediksi stok...'
                                : topRisk
                                    ? `${topRisk.product} diprediksi habis dalam ${topRisk.lasting_day} hari.`
                                    : 'Belum ada data risiko stok.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <p className="text-base font-semibold text-[#23262F]">Prediksi Penghasilan Kotor 7 Hari</p>
                        <p className="text-xs text-[#6B7280] mt-1">Grafik prediksi revenue berdasarkan output model AI.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
                            <div className="w-3.5 h-3.5 rounded-sm bg-[#2936C4]"></div> Revenue
                        </span>
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    {loading.revenue ? (
                        <div className="h-full w-full flex items-center justify-center text-sm text-[#8B95A7]">Memuat prediksi revenue...</div>
                    ) : error ? (
                        <div className="h-full w-full flex items-center justify-center text-sm text-[#E02D3C]">{error}</div>
                    ) : !hasRevenueForecastData ? (
                        <div className="h-full w-full flex items-center justify-center text-sm text-[#8B95A7]">Perlu minimal data 3 hari untuk menampilkan prediksi revenue.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300} minWidth={0}>
                            <LineChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke="#EEF0F3" vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="hari" axisLine={false} tickLine={false} tick={{ fill: "#23262F", fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8B95A7", fontSize: 11 }} tickFormatter={(value) => `${(value / 1000).toLocaleString("id-ID")}rb`} />
                                <Tooltip
                                    formatter={(value) => [`Rp ${Number(value || 0).toLocaleString("id-ID")}`, "Revenue"]}
                                    contentStyle={{ borderRadius: "12px", border: "1px solid #E6E8EC", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)", padding: "12px" }}
                                    labelStyle={{ fontWeight: "bold", color: "#23262F", paddingBottom: "4px" }}
                                />
                                <Line type="monotone" dataKey="omzet" stroke="#2936C4" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#2936C4' }} activeDot={{ r: 6, fill: '#2936C4' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <p className="text-base font-semibold text-[#23262F]">Top 5 Produk Risiko Habis</p>
                            <p className="text-xs text-[#6B7280] mt-1">Berdasarkan hasil prediksi demand AI.</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#E6E8EC] text-[11px] font-bold text-[#6B7280] uppercase">
                                    <th className="pb-3">Produk</th>
                                    <th className="pb-3 text-center">Lasting Day</th>
                                    <th className="pb-3 text-right">Total Demand</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                    {loading.demand ? (
                                        <tr>
                                            <td colSpan="3" className="py-8 text-center text-sm text-[#8B95A7]">Memuat data...</td>
                                        </tr>
                                    ) : demandTop5.length > 0 ? (
                                        demandTop5.map((item, index) => (
                                            <tr key={`${item.product}-${index}`} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 text-sm font-medium text-[#23262F]">{item.product}</td>
                                                <td className="py-3 text-center text-sm text-[#6B7280]">{item.lasting_day} hari</td>
                                                <td className="py-3 text-right text-sm font-semibold text-[#2936C4]">{item.total_demand}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="py-8 text-center text-sm text-[#8B95A7]">Tidak ada data produk risiko habis.</td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-5 border-2 border-[#E6E8EC] rounded-xl bg-white flex flex-col">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <p className="text-base font-semibold text-[#23262F]">Rekomendasi Bundling</p>
                            <p className="text-xs text-[#6B7280] mt-1">Hasil perhitungan skor frekuensi kombinasi produk.</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#E6E8EC] text-[11px] font-bold text-[#6B7280] uppercase">
                                    <th className="pb-3">Rekomendasi Bundling</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                {loading.bundling ? (
                                    <tr>
                                        <td className="py-8 text-center text-sm text-[#8B95A7]">Memuat data...</td>
                                    </tr>
                                ) : bundlingRows.length > 0 ? (
                                    bundlingRows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 text-sm text-[#23262F]">{row.suggestion}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="py-8 text-center text-sm text-[#8B95A7]">Belum ada rekomendasi bundling.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}
        </div>
    );
}