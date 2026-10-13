import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, dashboardPath } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';

/** Renders children only for signed-in users with one of the allowed roles. */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPath(user)} replace />;
  return children;
}
