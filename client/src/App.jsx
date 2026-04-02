import { AuthProvider, useAuth } from './context/authContext';
import AuthPage                  from './pages/AuthPage';
import UserDashboard             from './components/dashboard/UserDashboard';
import AdminDashboard            from './components/dashboard/AdminDashboard';

function AppContent() {
  const { token, user } = useAuth();

  if (!token) return <AuthPage />;
  if (user?.role === 'admin') return <AdminDashboard />;
  return <UserDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}