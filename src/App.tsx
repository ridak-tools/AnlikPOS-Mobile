import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/pages/Dashboard';
import POS from './components/pages/POS';
import Calls from './components/pages/Calls';
import Customers from './components/pages/Customers';
import Integrations from './components/pages/Integrations';
import Reports from './components/pages/Reports';
import { Products, Categories, Users, Printers, TablesDef, Menus } from './components/pages/SimplePages';
import { useCallback, useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { api } from './api/client';
import { initOrderNotifications } from './utils/orderNotify';
import { initPushNotifications } from './utils/pushNotify';

// ✅ BEYAZ EKRAN ÇÖKMELERİNİ ENGELLEYEN REACT HATA YAKALAYICI
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b1a33] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-4 border border-red-500/30">
            ⚠️
          </div>
          <h1 className="text-xl font-black mb-2">Görünüm Yüklenirken Bir Aksamı Oluştu</h1>
          <p className="text-sm text-blue-200/70 mb-6 max-w-xs leading-relaxed">
            Lütfen yenile butonuna basarak sayfayı tekrar yükleyin.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform"
          >
            Yeniden Yükle
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const { token, user, currentPage, setUser, logout } = useStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const verifyToken = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api('/mobile/me');
      if (d.ok) {
        setUser(d.user);
      } else {
        logout();
      }
    } catch {
      // Ignore
    }
  }, [token, setUser, logout]);

  useEffect(() => {
    initOrderNotifications();
    initPushNotifications();

    if (token && !user) {
      verifyToken();
    }
  }, [token, user, verifyToken]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const isLoggedIn = !!(token && user);

  return (
    <ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '16px',
            fontWeight: 600,
            fontSize: '14px',
          },
          duration: 3000,
        }}
      />

      {!isLoggedIn ? (
        <Login />
      ) : (
        <Layout onRefresh={handleRefresh}>
          <PageRenderer key={refreshKey} page={currentPage} />
        </Layout>
      )}
    </ErrorBoundary>
  );
}

function PageRenderer({ page }: { page: string }) {
  switch (page) {
    case 'dash': return <Dashboard />;
    case 'pos': return <POS />;
    case 'calls': return <Calls />;
    case 'customers': return <Customers />;
    case 'integrations': return <Integrations />;
    case 'products': return <Products />;
    case 'menus': return <Menus />;
    case 'categories': return <Categories />;
    case 'tablesDef': return <TablesDef />;
    case 'users': return <Users />;
    case 'printers': return <Printers />;
    case 'reports': return <Reports />;
    default: return <Dashboard />;
  }
}