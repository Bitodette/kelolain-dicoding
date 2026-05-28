import { useEffect, useState } from "react";
import axios from "axios";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Keuangan from "./pages/Keuangan";
import RiwayatTransaksi from "./pages/RiwayatTransaksi";
import Produk from "./pages/Produk";
import Kasir from "./pages/Kasir";
import Insight from "./pages/Insight";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { applyAuthHeader, getStoredAuth, setStoredAuth } from "./utils/auth";
import { API_BASE } from "./utils/api";

const routeToTab = {
  dashboard: "Dashboard",
  keuangan: "Keuangan",
  produk: "Produk",
  kasir: "Kasir",
  insight: "Insight",
  settings: "Settings",
};

function getActiveTab(pathname) {
  const segment = pathname.split("/").filter(Boolean)[0];
  return routeToTab[segment] || "Dashboard";
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [insightCache, setInsightCache] = useState({
    revenueForecast: [],
    demandTop5: [],
    bundlingSuggestions: [],
    fetchedAt: null,
  });
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [authLoaded, setAuthLoaded] = useState(false);
  const allowedPages = auth?.user?.allowedPages || [];
  const isAuthenticated = Boolean(auth?.token);

  useEffect(() => {
    applyAuthHeader(auth?.token);
  }, [auth?.token]);

  useEffect(() => {
    const initAuth = async () => {
      if (!auth?.token) {
        setAuthLoaded(true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Auth refresh failed');
        }
        const data = await response.json();
        const refreshedAuth = { ...auth, user: data.user };
        setAuth(refreshedAuth);
        setStoredAuth(refreshedAuth);
      } catch (err) {
        console.error('Failed to refresh auth:', err);
        setAuth(null);
        setStoredAuth(null);
      } finally {
        setAuthLoaded(true);
      }
    };

    initAuth();
  }, []);

  const fetchAndCacheInsightData = async () => {
    try {
      const [revenueRes, demandRes, bundlingRes] = await Promise.all([
        axios.get(`${API_BASE}/api/ai/revenue`),
        axios.get(`${API_BASE}/api/ai/demand`),
        axios.get(`${API_BASE}/api/ai/bundling`),
      ]);

      setInsightCache({
        revenueForecast: Array.isArray(revenueRes.data?.result) ? revenueRes.data.result : [],
        demandTop5: Array.isArray(demandRes.data?.result) ? demandRes.data.result : [],
        bundlingSuggestions: Array.isArray(bundlingRes.data?.result) ? bundlingRes.data.result : [],
        fetchedAt: Date.now(),
      });

      return true;
    } catch (err) {
      console.error('Failed to cache insight data:', err);
      return false;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const insightCacheStale = !insightCache.fetchedAt || Date.now() - insightCache.fetchedAt > 10 * 60 * 1000;
    if (!insightCacheStale) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const cached = await fetchAndCacheInsightData();
      if (cached) {
        setNotifications((current) =>
          current.some((notif) => notif.id === 'insight-ready')
            ? current
            : [
                ...current,
                { id: 'insight-ready', text: 'Insight sudah tersedia' },
              ]
        );
      }
    }, 1800);

    const lowStockTimer = window.setTimeout(() => {
      setNotifications((current) =>
        current.some((notif) => notif.id === 'low-stock')
          ? current
          : [
              ...current,
              { id: 'low-stock', text: 'Alert: stok menipis' },
            ]
      );
    }, 4200);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(lowStockTimer);
    };
  }, [isAuthenticated, location.pathname, insightCache.fetchedAt]);

  const handleLogin = (authData) => {
    setStoredAuth(authData);
    setAuth(authData);
  };

  const handleLogout = () => {
    setStoredAuth(null);
    setAuth(null);
    navigate('/login', { replace: true });
  };

  if (auth?.token && !authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#23262F]">
        Memuat data pengguna...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      {isAuthenticated && (
        <Sidebar activeTab={activeTab} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} allowedPages={allowedPages} />
      )}

      <main className="flex-1 bg-white">
        {isAuthenticated && <Navbar activeTab={activeTab} setMobileOpen={setMobileOpen} onLogout={handleLogout} notifications={notifications} />}
        <div className={isAuthenticated ? "px-4 sm:px-8 pb-8 max-w-7xl mx-auto" : ""}>
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />} />
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} allowedPages={allowedPages} requiredPage="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/keuangan"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} allowedPages={allowedPages} requiredPage="keuangan">
                  <Keuangan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/keuangan/riwayat"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} allowedPages={allowedPages} requiredPage="keuangan">
                  <RiwayatTransaksi />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produk"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} allowedPages={allowedPages} requiredPage="produk">
                  <Produk />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kasir"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} allowedPages={allowedPages} requiredPage="kasir">
                  <Kasir />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insight"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} allowedPages={allowedPages} requiredPage="insight">
                  <Insight initialData={insightCache} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} allowedPages={allowedPages} requiredPage="settings">
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
            />
          </Routes>
        </div>
      </main>

      {mobileOpen && isAuthenticated && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
        />
      )}
    </div>
  );
}

export default App;
