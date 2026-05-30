import { useEffect, useRef, useState } from "react";
import { BellIcon, Bars3Icon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar({ activeTab, setMobileOpen, onLogout, notifications = [], onMarkRead, onMarkAllRead }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const notifMenuRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const isRiwayat = location.pathname === "/keuangan/riwayat";

    const unreadCount = notifications.filter((n) => !n.read).length;

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

    const handleNotifClick = (n) => {
        if (onMarkRead) onMarkRead(n.id);
        if (n.link) navigate(n.link);
        setIsNotifMenuOpen(false);
    };

    return(
        <header className={`sticky top-0 z-20 flex w-full items-center justify-between bg-white px-4 sm:px-8 py-4 sm:py-8 ${isScrolled ? "border-b border-gray-200" : ""}`}>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setMobileOpen && setMobileOpen(true)}
                    className="xl:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100"
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
                    <h2 className="text-lg sm:text-2xl font-bold text-[#23262F] truncate max-w-[180px] sm:max-w-none leading-none">
                        {activeTab}
                    </h2>
                )}
            </div>
            <div className="hidden md:flex items-center gap-4">
                <div ref={notifMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsNotifMenuOpen((prev) => !prev)}
                        className="relative flex items-center justify-center text-[#23262F] hover:text-grey-100 transition-colors"
                    >
                        <BellIcon className="w-6 h-6" aria-hidden="true" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 bg-[#FF3B30] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] leading-none">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotifMenuOpen && (
                        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg z-30">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <span className="text-sm font-semibold text-gray-900">Notifikasi</span>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => { if (onMarkAllRead) onMarkAllRead(); }}
                                        className="text-xs font-semibold text-[#2936C4] hover:underline"
                                    >
                                        Tandai dibaca
                                    </button>
                                )}
                            </div>
                            {notifications.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                    Belum ada notifikasi.
                                </div>
                            ) : (
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            onClick={() => handleNotifClick(notification)}
                                            className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${
                                                notification.read ? "text-gray-500" : "text-gray-900 font-medium bg-[#F8FAFC]"
                                            }`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                {!notification.read && (
                                                    <span className="w-2 h-2 rounded-full bg-[#2936C4] mt-1.5 shrink-0" />
                                                )}
                                                <span className={notification.read ? "ml-4" : ""}>
                                                    {notification.text}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div ref={profileMenuRef} className="relative ml-2">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="shrink-0 flex items-center justify-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#E6E8EC] border border-[#D1D5DB] flex items-center justify-center overflow-hidden hover:border-[#2936C4] transition-colors">
                      <svg className="w-6 h-6 text-[#8B95A7]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-3 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-2">
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-[#23262F] hover:bg-gray-100"
                      >
                        Profil
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[#E02D3C] hover:bg-red-50"
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
