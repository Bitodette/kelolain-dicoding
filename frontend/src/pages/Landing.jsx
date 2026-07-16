import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ShoppingCartIcon,
  BanknotesIcon,
  CubeIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Logo from "../components/Logo";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: (
      <ShoppingCartIcon className="w-7 h-7" />
    ),
    title: "Kasir Cepat & Mudah",
    desc: "Transaksi point-of-sale yang intuitif dengan tampilan seperti tablet. Cocok untuk ritel, kuliner, dan UMKM.",
  },
  {
    icon: (
      <BanknotesIcon className="w-7 h-7" />
    ),
    title: "Manajemen Keuangan",
    desc: "Pantau pemasukan, pengeluaran, dan laba bersih secara real-time. Lengkap dengan laporan keuangan & grafik interaktif.",
  },
  {
    icon: (
      <CubeIcon className="w-7 h-7" />
    ),
    title: "Manajemen Stok Produk",
    desc: "Kelola inventaris dengan mudah, lengkap dengan scanner OCR untuk input stok dari nota. Pantau stok menipis secara otomatis.",
  },
  {
    icon: (
      <SparklesIcon className="w-7 h-7" />
    ),
    title: "Prediksi & Insight AI",
    desc: "Dapatkan prediksi pendapatan 7 hari ke depan dan rekomendasi bundling produk berdasarkan data penjualan Anda.",
  },
  {
    icon: (
      <Cog6ToothIcon className="w-7 h-7" />
    ),
    title: "Kustomisasi & Role",
    desc: "Atur akses pengguna berdasarkan peran. Setiap karyawan bisa memiliki tampilan dan fitur yang berbeda sesuai kebutuhan.",
  },
  {
    icon: (
      <ChartBarIcon className="w-7 h-7" />
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

function LaptopMockup({ src, alt }) {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="relative bg-[#1a1d23] rounded-t-xl rounded-b-sm p-2 pb-3 shadow-[0_20px_80px_-12px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-1.5 px-2 pb-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="relative overflow-hidden rounded-lg bg-white">
          <img src={src} alt={alt} className="w-full h-auto" />
        </div>
      </div>
      {/* Stand */}
      <div className="mx-auto w-[18%] h-2 bg-[#2c2f36] rounded-b-lg shadow-md" />
      <div className="mx-auto w-[30%] h-1 bg-[#3a3e47] rounded-b-sm opacity-50" />
    </div>
  );
}

function PhoneMockup({ src, alt }) {
  return (
    <div className="relative mx-auto w-fit">
      <img src={src} alt={alt} className="w-full max-w-[280px] sm:max-w-[320px] h-auto" />
    </div>
  );
}

export default function Landing() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const screenshotRef = useRef(null);
  const stepsRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* ── Hero entrance ── */
      const hero = heroRef.current;
      const heroTl = gsap.timeline();
      heroTl
        .fromTo(
          hero.querySelectorAll("[data-anim='hero-badge'], [data-anim='hero-heading'], [data-anim='hero-sub'], [data-anim='hero-btns']"),
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.12 }
        )
        .fromTo(
          hero.querySelector("[data-anim='hero-phone']"),
          { y: 60, opacity: 0, scale: 0.9, rotateY: 8 },
          { y: 0, opacity: 1, scale: 1, rotateY: 0, duration: 0.8, ease: "power4.out" },
          "-=0.3"
        );

      gsap.to(hero.querySelectorAll("[data-anim='float-particle']"), {
        y: -25,
        duration: 2.5 + Math.random() * 1.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      /* ── Features ── */
      ScrollTrigger.create({
        trigger: featuresRef.current,
        start: "top 70%",
        onEnter: () => {
          gsap.fromTo(
            featuresRef.current.querySelector("[data-anim='section-header']"),
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
          );
          gsap.fromTo(
            featuresRef.current.querySelectorAll("[data-anim='feature-card']"),
            { y: 50, opacity: 0 },
            {
              y: 0, opacity: 1, duration: 0.5, ease: "power3.out",
              stagger: 0.06,
            }
          );
        },
        once: true,
      });

      /* ── Screenshot ── */
      ScrollTrigger.create({
        trigger: screenshotRef.current,
        start: "top 75%",
        onEnter: () => {
          gsap.fromTo(
            screenshotRef.current.querySelector("[data-anim='section-header']"),
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
          );
          gsap.fromTo(
            screenshotRef.current.querySelector("[data-anim='screenshot-laptop']"),
            { y: 60, opacity: 0, scale: 0.92 },
            { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" }
          );
          gsap.fromTo(
            screenshotRef.current.querySelector("[data-anim='screenshot-cta']"),
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.3 }
          );
        },
        once: true,
      });

      /* ── Steps ── */
      ScrollTrigger.create({
        trigger: stepsRef.current,
        start: "top 70%",
        onEnter: () => {
          gsap.fromTo(
            stepsRef.current.querySelector("[data-anim='section-header']"),
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
          );
          gsap.fromTo(
            stepsRef.current.querySelectorAll("[data-anim='step-item']"),
            { x: (i) => (i % 2 === 0 ? -40 : 40), opacity: 0 },
            {
              x: 0, opacity: 1, duration: 0.6, ease: "power3.out",
              stagger: 0.15,
            }
          );
        },
        once: true,
      });

      /* ── CTA ── */
      ScrollTrigger.create({
        trigger: ctaRef.current,
        start: "top 75%",
        onEnter: () => {
          gsap.fromTo(
            ctaRef.current,
            { scale: 0.88, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.4)" }
          );
        },
        once: true,
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#23262F] overflow-hidden">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E6E8EC]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
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
              <Link to="/login" className="text-sm font-semibold text-[#6B7280] hover:text-[#23262F] transition-colors hidden sm:block">
                Masuk
              </Link>
              <Link to="/register" className="btn btn-primary text-sm !px-5 !py-2.5 !rounded-xl">
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-10 sm:pt-14 lg:pt-20 pb-16 sm:pb-24 lg:pb-32 px-4 lg:px-16">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] via-white to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-gradient-to-br from-[#2936C4]/8 via-[#66D3CC]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(41,54,196,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(41,54,196,0.03)_1px,transparent_1px)] bg-[length:60px_60px] pointer-events-none" />

        {/* Floating particles */}
        <div data-anim="float-particle" className="absolute top-24 left-[8%] w-3 h-3 rounded-full bg-[#2936C4]/15 pointer-events-none" />
        <div data-anim="float-particle" className="absolute top-36 right-[12%] w-5 h-5 rounded-full bg-[#66D3CC]/15 pointer-events-none" style={{ animationDelay: "0.4s" }} />
        <div data-anim="float-particle" className="absolute bottom-28 left-[18%] w-4 h-4 rounded-full bg-[#2936C4]/10 pointer-events-none" style={{ animationDelay: "0.8s" }} />
        <div data-anim="float-particle" className="absolute bottom-36 right-[22%] w-6 h-6 rounded-full bg-[#66D3CC]/10 pointer-events-none" style={{ animationDelay: "1.2s" }} />
        <div data-anim="float-particle" className="absolute top-1/3 left-[5%] w-2 h-2 rounded-full bg-[#2936C4]/20 pointer-events-none" style={{ animationDelay: "0.6s" }} />

        {/* Gradient orb */}
        <div className="absolute top-1/4 right-[5%] w-64 h-64 bg-gradient-to-br from-[#66D3CC]/10 to-[#2936C4]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="text-center lg:text-left">
              <div data-anim="hero-badge" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2936C4]/8 text-[#2936C4] text-xs sm:text-sm font-semibold mb-4 lg:mb-6 border border-[#2936C4]/10">
                All-in-One Business Management
              </div>

              <h1 data-anim="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4 lg:mb-6">
                Kelola Bisnismu
                <br />
                <span className="bg-gradient-to-r from-[#2936C4] to-[#66D3CC] bg-clip-text text-transparent">Lebih Cerdas</span>
              </h1>

              <p data-anim="hero-sub" className="text-sm sm:text-base lg:text-lg text-[#6B7280] max-w-lg mx-auto lg:mx-0 mb-6 lg:mb-8 leading-relaxed">
                Platform manajemen bisnis all-in-one: kasir, stok, keuangan, dan insight AI.
                Dirancang khusus untuk UMKM dan bisnis ritel Indonesia.
              </p>

              <div data-anim="hero-btns" className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link to="/register" className="btn btn-primary text-sm sm:text-base !px-8 !py-3.5 w-full sm:w-auto shadow-lg shadow-[#2936C4]/25 hover:shadow-xl hover:shadow-[#2936C4]/30 transition-shadow">
                  Mulai Gratis
                </Link>
                <a href="#fitur" className="btn btn-secondary text-sm sm:text-base !px-8 !py-3.5 w-full sm:w-auto">
                  Lihat Fitur
                </a>
              </div>
            </div>

            {/* Hero Image */}
            <div data-anim="hero-phone" className="flex items-center justify-center lg:justify-end">
              <PhoneMockup src="/screenshots/dashboard-mobile.png" alt="Dashboard Mobile" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" ref={featuresRef} className="py-12 sm:py-16 lg:py-24 px-4 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div data-anim="section-header" className="text-center mb-12 sm:mb-16">
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
                data-anim="feature-card"
                className="group relative bg-white rounded-2xl p-6 sm:p-8 border border-[#E6E8EC] hover:border-[#2936C4]/20 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] flex items-center justify-center text-[#2936C4] mb-5 group-hover:scale-110 group-hover:rotate-2 transition-all duration-300 shadow-sm">
                  {f.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2.5">{f.title}</h3>
                <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot Preview */}
      <section id="screenshot" ref={screenshotRef} className="py-12 sm:py-16 lg:py-24 px-4 bg-gradient-to-b from-[#F8FAFC] to-white">
        <div className="max-w-7xl mx-auto">
          <div data-anim="section-header" className="text-center mb-12 sm:mb-16">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#2936C4]">Preview</span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold mt-3 mb-4">
              Lihat Tampilan Aplikasi
            </h2>
            <p className="text-[#6B7280] max-w-2xl mx-auto text-sm sm:text-base lg:text-lg">
              Antarmuka yang bersih, modern, dan mudah digunakan di berbagai perangkat.
            </p>
          </div>

          <div data-anim="screenshot-laptop" className="-mx-2 sm:mx-0">
            <LaptopMockup src="/screenshots/keuangan-desktop.png" alt="Keuangan" />
          </div>

          <div data-anim="screenshot-cta" className="mt-12 text-center">
            <Link to="/register" className="btn btn-primary text-sm sm:text-base !px-8 !py-3.5 shadow-lg shadow-[#2936C4]/25">
              Coba Gratis Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="cara-kerja" ref={stepsRef} className="py-12 sm:py-16 lg:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div data-anim="section-header" className="text-center mb-12 sm:mb-16">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#2936C4]">Cara Kerja</span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold mt-3 mb-4">
              Mulai dalam 4 Langkah
            </h2>
            <p className="text-[#6B7280] max-w-2xl mx-auto text-sm sm:text-base lg:text-lg">
              Tidak perlu ribet. Dalam hitungan menit, bisnis Anda sudah siap dikelola dengan Kelola-in.
            </p>
          </div>

          <div className="relative">
            <div className="hidden sm:block absolute left-1/2 -translate-x-0.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2936C4]/30 via-[#66D3CC]/30 to-transparent" />
            <div className="space-y-8 sm:space-y-12">
              {steps.map((step, i) => (
                <div
                  key={i}
                  data-anim="step-item"
                  className={`relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                >
                  <div className="flex-1 text-center sm:text-left">
                    <span className="text-[#2936C4]/15 text-5xl sm:text-7xl font-extrabold select-none leading-none block mb-1">{step.number}</span>
                    <h3 className="text-xl sm:text-2xl font-bold mt-1 mb-2">{step.title}</h3>
                    <p className="text-[#6B7280]">{step.desc}</p>
                  </div>
                  <div className="relative flex-shrink-0 hidden sm:block">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#2936C4] to-[#3d4ad7] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-[#2936C4]/30 z-10 relative transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#2936C4]/40">
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
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-[#2936C4] via-[#3843d1] to-[#1a1f7a] rounded-3xl p-8 sm:p-16 relative overflow-hidden shadow-2xl shadow-[#2936C4]/30">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#66D3CC]/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4">
              Siap Mengelola Bisnis Lebih Baik?
            </h2>
            <p className="text-[#C7D2FE] text-sm sm:text-base lg:text-lg max-w-xl mx-auto mb-8">
              Bergabung dengan 500+ bisnis lainnya. Gratis, tanpa ribet, tanpa kartu kredit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register" className="group inline-flex items-center gap-2 bg-white text-[#2936C4] font-bold px-8 py-3.5 rounded-xl hover:bg-[#EEF2FF] hover:scale-[1.02] transition-all duration-200 text-sm sm:text-base shadow-xl">
                Daftar Gratis Sekarang
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
