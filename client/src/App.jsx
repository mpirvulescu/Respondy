import { AuthProvider } from './context/authContext';
import AuthPage         from './pages/AuthPage';

export default function App() {
  // TODO: replace this with your router redirect once dashboard is ready
  const handleAuthSuccess = () => {
    console.log('Auth success — redirect to dashboard here');
  };

  return (
    <AuthProvider>
      <AuthPage onSuccess={handleAuthSuccess} />
    </AuthProvider>
  );
}