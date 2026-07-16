import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/api";
import { getStoredAuth, setStoredAuth } from "../utils/auth";

export default function Profile() {
    const auth = getStoredAuth();
    const [name, setName] = useState(auth?.user?.name || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password && password !== confirmPassword) {
            return setError("Password baru dan konfirmasi password tidak cocok");
        }

        setLoading(true);
        try {
            const data = { name };
            if (password) {
                data.password = password;
            }

            const response = await axios.put(`${API_BASE}/api/auth/profile`, data, {
                headers: {
                    Authorization: `Bearer ${auth.token}`,
                },
            });

            // Update stored user data
            const newAuth = { ...auth, user: response.data.user };
            setStoredAuth(newAuth);
            
            // Reload page to reflect changes in navbar/sidebar properly, 
            // since App.jsx state isn't directly exposed here unless we pass a setter.
            // Using window.location.reload() is simpler for now.
            setSuccess("Profil berhasil diperbarui!");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (err) {
            console.error("Gagal update profil:", err);
            setError(err.response?.data?.error || "Terjadi kesalahan saat memperbarui profil");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pt-4 sm:pt-8 pb-12 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[#E6E8EC]">
                    <div className="w-20 h-20 rounded-full bg-[#F3F4F6] border border-[#E6E8EC] flex items-center justify-center flex-shrink-0">
                        <svg className="w-10 h-10 text-[#8B95A7]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#23262F]">{auth?.user?.name || "User"}</h2>
                        <p className="text-xs font-semibold text-[#2936C4] bg-[#EEF2FF] inline-block px-2.5 py-1 rounded-md mt-2">
                            {(auth?.user?.roles || []).join(', ') || 'Tidak ada role'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">
                        {success}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-[#23262F] mb-2">Nama Lengkap</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E6E8EC] rounded-xl text-sm focus:bg-white focus:border-[#2936C4] focus:outline-none transition-colors"
                            placeholder="Masukkan nama lengkap Anda"
                            required
                        />
                    </div>

                    <div className="pt-4 border-t border-[#E6E8EC]">
                        <h3 className="text-sm font-bold text-[#23262F] mb-4">Ganti Password (Opsional)</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#6B7280] mb-2">Password Baru</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E6E8EC] rounded-xl text-sm focus:bg-white focus:border-[#2936C4] focus:outline-none transition-colors"
                                    placeholder="Biarkan kosong jika tidak ingin ganti"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#6B7280] mb-2">Konfirmasi Password Baru</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E6E8EC] rounded-xl text-sm focus:bg-white focus:border-[#2936C4] focus:outline-none transition-colors"
                                    placeholder="Ulangi password baru"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3"
                        >
                            {loading ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
