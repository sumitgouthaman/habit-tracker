import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
// Pages will be imported here
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import BottomNav from './components/BottomNav';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';

import OfflineIndicator from './components/OfflineIndicator';
import UpdatePrompt from './components/UpdatePrompt';

function PrivateLayout({ children }) {
  const { user, loading, isAllowed, isGuest } = useAuth();

  if (loading) return <div className="glass-panel" style={{ margin: '2rem' }}>Loading...</div>;

  // Allow access if user is logged in OR in guest mode
  if (!user && !isGuest) return <Navigate to="/login" />;

  if (isAllowed === false) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', padding: '2rem', textAlign: 'center'
      }}>
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-danger)' }}>Access Restricted</h2>
          <p style={{ color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
            This application is currently in development and access is limited to allowed testers.
          </p>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', opacity: 0.7 }}>
            Logging you out automatically...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ paddingBottom: '80px' }}>
        {children}
      </div>
      <BottomNav />
    </>
  );
}

import { HabitProvider } from './context/HabitContext';

function App() {
  return (
    <>
      <OfflineIndicator />
      <UpdatePrompt />
      <AuthProvider>
        <HabitProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <PrivateLayout>
                <Dashboard />
              </PrivateLayout>
            } />

            <Route path="/stats" element={
              <PrivateLayout>
                <Stats />
              </PrivateLayout>
            } />

            <Route path="/settings" element={
              <PrivateLayout>
                <Settings />
              </PrivateLayout>
            } />

          </Routes>
        </HabitProvider>
      </AuthProvider>
    </>
  );
}

export default App;
