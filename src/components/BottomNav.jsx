import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Settings } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { name: 'Today', icon: LayoutDashboard, path: '/' },
        { name: 'Stats', icon: BarChart2, path: '/stats' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '0.8rem 0',
            zIndex: 100
        }}>
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={item.name}
                        onClick={() => navigate(item.path)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-dim)', // Use precise colors
                            cursor: 'pointer'
                        }}
                    >
                        <item.icon size={24} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
