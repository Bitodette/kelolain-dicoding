import { useEffect, useState, useCallback } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";
import Dashboard from "./pages/Dashboard";
import Keuangan from "./pages/Keuangan";
import RiwayatTransaksi from "./pages/RiwayatTransaksi";
import Produk from "./pages/Produk";
import Kasir from "./pages/Kasir";
import Insight from "./pages/Insight";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import Profile from "./pages/Profile";
import { applyAuthHeader, getStoredAuth, setStoredAuth } from "./utils/auth";
import { API_BASE } from "./utils/api";
import LoadingSpinner from "./components/LoadingSpinner";
import axios from "axios";

const routeToTab = {
  dashboard: "Dashboard",
  keuangan: "Keuangan",
  produk: "Produk",
  kasir: "Kasir",
  insight: "Insight",
  settings: "Settings",
  profile: "Profil",
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
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [authLoaded, setAuthLoaded] = useState(false);
  const allowedPages = auth?.user?.allowedPages || [];
  const isAuthenticated = Boolean(auth?.token);

  useEffect(() => {
    applyAuthHeader(auth?.token);
  }, [auth?.token]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    const fetchNotifs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/notifications`);
        if (mounted) setNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Gagal mengambil notifikasi:", e);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const markNotificationRead = useCallback(async (id) => {
    try {
      await axios.patch(`${API_BASE}/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error("Gagal menandai notifikasi:", e);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await axios.patch(`${API_BASE}/api/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("Gagal menandai semua notifikasi:", e);
    }
  }, []);

  const handleLogin = (authData) => {
    setStoredAuth(authData);
    setAuth(authData);
  };

  const handleLogout = () => {
    setStoredAuth(null);
    setAuth(null);
    navigate('/login', { replace: true });
  };

  if (!authLoaded) {
    return <LoadingSpinner fullScreen text="Memuat..." />;
  }

  return (
    <ToastProvider>
    <ConfirmProvider>
    <div className="max-w-[1920px] w-full flex min-h-screen bg-white font-sans text-gray-900">
      {isAuthenticated && (
        <Sidebar activeTab={activeTab} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} allowedPages={allowedPages} />
      )}

      <main className="w-screen flex-1 bg-white overflow-x-hidden">
        {isAuthenticated && <Navbar activeTab={activeTab} setMobileOpen={setMobileOpen} onLogout={handleLogout} notifications={notifications} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} />}
        <div className={isAuthenticated ? "px-4 sm:px-8 pb-8 mx-auto" : ""}>
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />} />
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />

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
                    <Insight />
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
              path="/profile"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Profile />
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
          className="fixed inset-0 bg-black/30 z-40 xl:hidden"
        />
      )}
    </div>
    </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
