import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { SW_UPDATE_CHECK_INTERVAL_MS } from '../lib/constants';

export default function UpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker
    } = useRegisterSW({
        onRegistered(r) {
            // Check for updates periodically
            if (r) {
                setInterval(() => r.update(), SW_UPDATE_CHECK_INTERVAL_MS);
            }
        }
    });

    if (!needRefresh) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px', // Above bottom nav
            left: '1rem',
            right: '1rem',
            zIndex: 9999,
            background: 'var(--color-primary, #3b82f6)',
            color: '#fff',
            padding: '1rem',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
            <span style={{ fontSize: '0.875rem' }}>
                A new version is available!
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={() => updateServiceWorker(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.5rem 1rem',
                        background: '#fff',
                        color: 'var(--color-primary, #3b82f6)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                    }}
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
                <button
                    onClick={() => setNeedRefresh(false)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        background: 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}
                    aria-label="Dismiss"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
