import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5 0h.75a.75.75 0 0 0 .75-.75V4.5M19.5 4.5v15a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.75A2.25 2.25 0 0 1 6.75 4.5h12.75Z" />
      </svg>
    ),
    title: "Kasir Cepat & Mudah",
    desc: "Transaksi point-of-sale yang intuitif dengan tampilan seperti tablet. Cocok untuk ritel, kuliner, dan UMKM.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Manajemen Keuangan",
    desc: "Pantau pemasukan, pengeluaran, dan laba bersih secara real-time. Lengkap dengan laporan keuangan & grafik interaktif.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
    title: "Manajemen Stok Produk",
    desc: "Kelola inventaris dengan mudah, lengkap dengan scanner OCR untuk input stok dari nota. Pantau stok menipis secara otomatis.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
    title: "Prediksi & Insight AI",
    desc: "Dapatkan prediksi pendapatan 7 hari ke depan dan rekomendasi bundling produk berdasarkan data penjualan Anda.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
      </svg>
    ),
    title: "Kustomisasi & Role",
    desc: "Atur akses pengguna berdasarkan peran. Setiap karyawan bisa memiliki tampilan dan fitur yang berbeda sesuai kebutuhan.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
    title: "Laporan Detail",
    desc: "Lihat riwayat transaksi lengkap, grafik tren pemasukan, dan breakdown pengeluaran per kategori dalam satu dashboard.",
  },
];

const steps = [
  {
    number: "01",
    title: "Buat Akun",
    desc: "Daftar gratis dalam 2 menit. Tidak perlu kartu kredit.",
  },
  {
    number: "02",
    title: "Atur Produk & Kategori",
    desc: "Tambah produk secara manual atau scan nota dengan fitur OCR.",
  },
  {
    number: "03",
    title: "Mulai Transaksi",
    desc: "Gunakan kasir untuk mencatat penjualan. Semua tersimpan otomatis.",
  },
  {
    number: "04",
    title: "Pantau & Kembangkan",
    desc: "Lihat laporan keuangan, prediksi AI, dan insight untuk mengembangkan bisnis.",
  },
];

const screenshots = [
  { label: "Dashboard", desc: "Overview bisnis dalam satu layar", file: "dashboard-mobile.png" },
  { label: "Kasir", desc: "Antarmuka POS yang cepat & responsif", file: null },
  { label: "Produk", desc: "Manajemen stok dengan OCR scanner", file: null },
  { label: "Keuangan", desc: "Laporan keuangan & grafik interaktif", file: null },
  { label: "Insight AI", desc: "Prediksi & rekomendasi cerdas", file: null },
];

function useOnScreen(threshold = 0.15) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}

export default function Landing() {
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  }, []);

  const [heroRef, heroVisible] = useOnScreen(0.1);
  const [featuresRef, featuresVisible] = useOnScreen(0.1);
  const [screenshotsRef, screenshotsVisible] = useOnScreen(0.1);
  const [stepsRef, stepsVisible] = useOnScreen(0.1);
  const [ctaRef, ctaVisible] = useOnScreen(0.1);

  return (
    <div className="min-h-screen bg-white font-sans text-[#23262F] overflow-hidden">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E6E8EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo className="flex-shrink-0 w-6 h-6" />
              <h1 className="text-xl font-bold text-[#5B567A]">
                Kelola<span className="text-[#2936C4]">.in</span>
              </h1>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#fitur" className="text-sm font-semibold text-[#6B7280] hover:text-[#23262F] transition-colors">Fitur</a>
              <a href="#screenshot" className="text-sm font-semibold text-[#6B7280] hover:text-[#23262F] transition-colors">Preview</a>
              <a href="#cara-kerja" className="text-sm font-semibold text-[#6B7280] hover:text-[#23262F] transition-colors">Cara Kerja</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link to="/login" className="btn btn-text text-sm !px-4 !py-2 hidden sm:inline-flex">
                Masuk
              </Link>
              <Link to="/register" className="btn btn-primary text-sm !px-4 !py-2 !rounded-xl">
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative pt-10 sm:pt-14 lg:pt-20 pb-16 sm:pb-24 lg:pb-32 px-4"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#EEF2FF] via-white to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#2936C4]/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className={`text-center lg:text-left transition-all duration-700 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF2FF] text-[#2936C4] text-xs sm:text-sm font-semibold mb-4 lg:mb-6">
                <span className="w-2 h-2 rounded-full bg-[#2936C4] animate-pulse" />
                All-in-One Business Management
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4 lg:mb-6">
                Kelola Bisnismu
                <br />
                <span className="text-[#2936C4]">Lebih Cerdas</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-[#6B7280] max-w-lg mx-auto lg:mx-0 mb-6 lg:mb-8 leading-relaxed">
                Platform manajemen bisnis all-in-one: kasir, stok, keuangan, dan insight AI.
                Dirancang khusus untuk UMKM dan bisnis ritel Indonesia.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link to="/register" className="btn btn-primary text-sm sm:text-base !px-8 !py-3.5 w-full sm:w-auto">
                  Mulai Gratis
                </Link>
                <a href="#fitur" className="btn btn-secondary text-sm sm:text-base !px-8 !py-3.5 w-full sm:w-auto">
                  Lihat Fitur
                </a>
              </div>

            </div>

            {/* Hero Image */}
            <div className={`relative flex items-center justify-center transition-all duration-700 delay-200 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <div className="relative w-full max-w-[400px] lg:max-w-none flex justify-center">
                <img
                  src="/screenshots/dashboard-mobile.png"
                  alt="Dashboard Mobile"
                  className="w-full max-w-[280px] sm:max-w-[320px] h-auto animate-float"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" ref={featuresRef} className="py-12 sm:py-16 lg:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-12 sm:mb-16 transition-all duration-700 ease-out ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#2936C4]">Fitur</span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold mt-3 mb-4">
              Semua yang Anda Butuhkan
            </h2>
            <p className="text-[#6B7280] max-w-2xl mx-auto text-sm sm:text-base lg:text-lg">
              Dari kasir hingga insight AI, semua fitur dirancang untuk membantu bisnis Anda berkembang.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`group relative bg-white border border-[#E6E8EC] rounded-2xl p-6 sm:p-8 hover:shadow-lg hover:border-[#2936C4]/20 hover:-translate-y-1 transition-all duration-300 ease-out ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-[#2936C4] mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2.5">{f.title}</h3>
                <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Preview */}
      <section id="screenshot" ref={screenshotsRef} className="py-12 sm:py-16 lg:py-24 px-4 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-12 sm:mb-16 transition-all duration-700 ease-out ${screenshotsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#2936C4]">Preview</span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold mt-3 mb-4">
              Lihat Tampilan Aplikasi
            </h2>
            <p className="text-[#6B7280] max-w-2xl mx-auto text-sm sm:text-base lg:text-lg">
              Antarmuka yang bersih, modern, dan mudah digunakan di berbagai perangkat.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 sm:gap-8 items-start">
            {screenshots.map((s, i) => (
              <div
                key={i}
                className={`group transition-all duration-500 ease-out ${screenshotsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {s.file ? (
                  <img
                    src={`/screenshots/${s.file}`}
                    alt={s.label}
                    className="w-full h-auto rounded-xl shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300"
                  />
                ) : (
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[#EEF2FF] to-white border border-[#E6E8EC] flex flex-col items-center justify-center p-6 group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300">
                    <svg className="w-10 h-10 text-[#2936C4]/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.41a2.25 2.25 0 0 1 3.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span className="text-xs sm:text-sm text-center font-semibold text-[#8B95A7] group-hover:text-[#23262F] transition-colors">{s.label}</span>
                    <span className="text-[10px] sm:text-xs text-center text-[#8B95A7] mt-1">{s.desc}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={`mt-10 text-center transition-all duration-700 ease-out delay-300 ${screenshotsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Link to="/register" className="btn btn-primary text-sm sm:text-base !px-8 !py-3.5">
              Coba Gratis Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="cara-kerja" ref={stepsRef} className="py-12 sm:py-16 lg:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`text-center mb-12 sm:mb-16 transition-all duration-700 ease-out ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#2936C4]">Cara Kerja</span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold mt-3 mb-4">
              Mulai dalam 4 Langkah
            </h2>
            <p className="text-[#6B7280] max-w-2xl mx-auto text-sm sm:text-base lg:text-lg">
              Tidak perlu ribet. Dalam hitungan menit, bisnis Anda sudah siap dikelola dengan Kelola-in.
            </p>
          </div>

          <div className="relative">
            <div className="hidden sm:block absolute left-1/2 -translate-x-0.5 top-0 bottom-0 w-0.5 bg-[#E6E8EC]" />
            <div className="space-y-8 sm:space-y-12">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'} transition-all duration-700 ease-out ${stepsVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${i % 2 === 0 ? '-translate-x-8' : 'translate-x-8'}`}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="flex-1 text-center sm:text-left">
                    <span className="text-[#2936C4]/20 text-5xl sm:text-6xl font-extrabold select-none">{step.number}</span>
                    <h3 className="text-xl sm:text-2xl font-bold mt-1 mb-2">{step.title}</h3>
                    <p className="text-[#6B7280]">{step.desc}</p>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#2936C4] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-[#2936C4]/20 z-10 relative transition-transform duration-300 hover:scale-110">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-12 sm:py-16 lg:py-24 px-4">
        <div className={`max-w-4xl mx-auto text-center bg-gradient-to-br from-[#2936C4] to-[#1a1f7a] rounded-3xl p-8 sm:p-16 relative overflow-hidden transition-all duration-700 ease-out ${ctaVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#66D3CC]/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4">
              Siap Mengelola Bisnis Lebih Baik?
            </h2>
            <p className="text-[#C7D2FE] text-sm sm:text-base lg:text-lg max-w-xl mx-auto mb-8">
              Bergabung dengan 500+ bisnis lainnya. Gratis, tanpa ribet, tanpa kartu kredit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register" className="group inline-flex items-center gap-2 bg-white text-[#2936C4] font-bold px-8 py-3.5 rounded-xl hover:bg-[#EEF2FF] hover:scale-[1.02] transition-all duration-200 text-sm sm:text-base shadow-lg">
                Daftar Gratis Sekarang
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold px-6 py-3.5 rounded-xl border border-white/20 hover:border-white/40 transition-all duration-200 text-sm sm:text-base">
                Sudah punya akun? Masuk
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E6E8EC] py-8 sm:py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo className="flex-shrink-0 w-6 h-6" />
              <h1 className="text-lg font-bold text-[#5B567A]">
                Kelola<span className="text-[#2936C4]">.in</span>
              </h1>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-[#6B7280]">
              <a href="#fitur" className="hover:text-[#23262F] transition-colors">Fitur</a>
              <a href="#screenshot" className="hover:text-[#23262F] transition-colors">Preview</a>
              <a href="#cara-kerja" className="hover:text-[#23262F] transition-colors">Cara Kerja</a>
            </nav>
          </div>
          <div className="mt-6 text-center text-xs sm:text-sm text-[#8B95A7]">
            &copy; {new Date().getFullYear()} Kelola.in. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
