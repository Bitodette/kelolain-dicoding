import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ isAuthenticated, allowedPages = [], requiredPage, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPage && !allowedPages.includes(requiredPage)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
