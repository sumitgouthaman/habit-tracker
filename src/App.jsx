import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
// Pages will be imported here
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import BottomNav from './components/BottomNav';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function PrivateLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="glass-panel" style={{ margin: '2rem' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

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
    <AuthProvider>
      <HabitProvider>
        <Router>
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
        </Router>
      </HabitProvider>
    </AuthProvider>
  );
}

export default App;
