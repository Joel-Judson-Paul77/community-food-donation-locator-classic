import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Loader from './components/Loader.jsx';
import { useAuth, dashboardPath } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import DonationDetail from './pages/DonationDetail.jsx';
import DonationForm from './pages/DonationForm.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import DonorDashboard from './pages/DonorDashboard.jsx';
import RecipientDashboard from './pages/RecipientDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return <Navigate to={dashboardPath(user)} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/donations/:id" element={<DonationDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route
            path="/donate"
            element={<ProtectedRoute roles={['donor']}><DonationForm /></ProtectedRoute>}
          />
          <Route
            path="/donations/:id/edit"
            element={<ProtectedRoute roles={['donor', 'admin']}><DonationForm /></ProtectedRoute>}
          />
          <Route
            path="/dashboard/donor"
            element={<ProtectedRoute roles={['donor']}><DonorDashboard /></ProtectedRoute>}
          />
          <Route
            path="/dashboard/recipient"
            element={<ProtectedRoute roles={['recipient']}><RecipientDashboard /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>}
          />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>🌱 FoodShare: Community Food Donation &amp; Surplus Locator</span>
          <span className="muted">Less waste, fewer empty plates.</span>
        </div>
      </footer>
    </>
  );
}
