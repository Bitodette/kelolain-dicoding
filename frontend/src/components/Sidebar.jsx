import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import {
  Squares2X2Icon,
  BanknotesIcon,
  CubeIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";


export default function Sidebar({ activeTab, mobileOpen, setMobileOpen, allowedPages = [] }) {
  const [collapsed, setCollapsed] = useState(false);
  const menuItemBaseClass = "flex w-full items-center py-3 rounded-xl transition-all duration-300";
  const menuItemStateClass = "justify-start px-4 gap-3";
  const logoWrapperClass = collapsed
    ? "flex w-full items-center justify-center gap-0 px-8 overflow-hidden whitespace-nowrap transition-all duration-300"
    : "flex w-full items-center justify-left gap-2 px-8 overflow-hidden whitespace-nowrap transition-all duration-300";
  const logoTextClass = collapsed ? "max-w-0 opacity-0 translate-x-1" : "max-w-40 opacity-100 translate-x-0";

  const menuItems = [
    { label: "Dashboard", icon: "dashboard", to: "/dashboard", page: "dashboard" },
    { label: "Keuangan", icon: "keuangan", to: "/keuangan", page: "keuangan" },
    { label: "Produk", icon: "produk", to: "/produk", page: "produk" },
    { label: "Kasir", icon: "kasir", to: "/kasir", page: "kasir" },
    { label: "Insight", icon: "insight", to: "/insight", page: "insight" },
    { label: "Settings", icon: "settings", to: "/settings", footer: true, page: "settings" },
  ];

  const renderMenuItem = ({ label, icon, to, footer = false }) => {
    const isActive = activeTab === label;
    const itemClassName = `${menuItemBaseClass} ${menuItemStateClass} ${isActive ? "bg-[#EEF0F6] font-bold" : "hover:bg-gray-50 font-medium"}`;

    const heroMap = {
      Dashboard: Squares2X2Icon,
      Keuangan: BanknotesIcon,
      Produk: CubeIcon,
      Kasir: ShoppingCartIcon,
      Insight: ChartBarIcon,
      Settings: Cog6ToothIcon,
    };

    const IconComp = heroMap[label] || Squares2X2Icon;

    return (
      <Link
        key={label}
        to={to}
        onClick={() => {
          if (mobileOpen) setMobileOpen(false);
        }}
        className={itemClassName}
        title={label}
      >
        <IconComp
          className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-[#5B567A]' : 'text-[#878787]'}`}
          aria-hidden="true"
        />
        <span
          style={{
            color: isActive ? '#5B567A' : '#878787',
            opacity: collapsed ? 0 : 1,
            transition: "opacity 300ms",
            width: collapsed ? 0 : "auto",
            overflow: "hidden",
          }}
        >
          {label === "Settings" ? "Pengaturan" : label}
        </span>
      </Link>
    );
  };

  const baseWidth = collapsed ? "w-[88px]" : "w-64";

  return (
    <div className={`bg-[#F9F9F9] h-screen border-r border-gray-100 flex flex-col transition-transform duration-300 ${baseWidth} transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0 fixed xl:sticky xl:top-0 xl:self-start xl:shrink-0 xl:flex z-50 overflow-y-auto`}>
      {/* logo */}
      <div className="relative flex items-center justify-center py-9">
        <div className={logoWrapperClass}>
          <Logo className="flex-shrink-0 w-6 h-6" />
          <h1
            className={`text-xl font-bold text-[#5B567A] overflow-hidden transition-all duration-300 ${logoTextClass}`}
          >
            Kelola<span className="text-[#2936C4]">.in</span>
          </h1>
        </div>
      
        {/* close button on mobile */}
        <button onClick={() => setMobileOpen(false)} className="pr-4 lg:hidden">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* collapse button */}
      {/* <div className="px-4 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2 transition-colors rounded-lg hover:bg-gray-100"
        >
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>
      </div> */}

      {/* menu */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.filter((item) => !item.footer && allowedPages.includes(item.page)).map(renderMenuItem)}
      </nav>

      {/* footer - settings */}
      <div className="px-4 pb-4 mt-auto border-t border-gray-200">
        {menuItems.filter((item) => item.footer && allowedPages.includes(item.page)).map(renderMenuItem)}
      </div>
    </div>
  );
}