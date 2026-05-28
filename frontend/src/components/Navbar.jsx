import { useEffect, useRef, useState } from "react";
import { BellIcon, ChevronDownIcon, Bars3Icon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";

export default function Navbar({ activeTab, setMobileOpen, onLogout, notifications = [] }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const notifMenuRef = useRef(null);
    const location = useLocation();
    const isRiwayat = location.pathname === "/keuangan/riwayat";

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 0);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });

        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
            if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
                setIsNotifMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return(
        <header className={`sticky top-0 z-20 flex w-full items-center justify-between bg-white px-4 sm:px-8 py-4 sm:py-8 ${isScrolled ? "border-b border-gray-200" : ""}`}>
            <div className="flex items-center gap-3">
                {/* mobile menu button - left */}
                <button
                    onClick={() => setMobileOpen && setMobileOpen(true)}
                    className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="Open menu"
                >
                    <Bars3Icon className="w-6 h-6" />
                </button>   
                {isRiwayat ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link to="/keuangan" className="p-1 sm:p-2 -ml-1 sm:-ml-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#23262F]" />
                        </Link>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-[#23262F]">Riwayat Transaksi</h2>
                            <p className="hidden sm:block text-sm text-[#6B7280]">Lihat semua pemasukan dan pengeluaran</p>
                        </div>
                    </div>
                ) : (
                    <h2 className="text-lg sm:text-2xl font-bold text-[#23262F] truncate max-w-[180px] sm:max-w-none">
                        {activeTab}
                    </h2>
                )}
            </div>
            <div className="hidden md:flex items-center gap-4">
                <div ref={notifMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsNotifMenuOpen((prev) => !prev)}
                        className="relative text-[#23262F] hover:text-grey-100 transition-colors"
                    >
                        <BellIcon className="w-6 h-6" aria-hidden="true" />
                        {notifications.length > 0 && (
                            <span className="absolute -top-1.5 -right-2 bg-[#FF3B30] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] leading-none">
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {isNotifMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg py-2 z-30">
                            <div className="px-4 py-3 text-sm font-semibold text-gray-900">Notifikasi</div>
                            <div className="border-t border-gray-100" />
                            {notifications.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                    Belum ada notifikasi baru. Insight dan alert akan muncul saat ada pembaruan yang menarik.
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        {notification.text}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
                <div ref={profileMenuRef} className="relative ml-2">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2 text-sm font-medium text-[#23262F] hover:bg-[#E5E7EB] transition-colors"
                  >
                    <img
                      src="https://randomuser.me/api/portraits/men/1.jpg"
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    />
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isProfileMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-3 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[#23262F] hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
            </div>
        </header>
    )

}