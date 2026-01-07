import { useRegisterSW } from 'virtual:pwa-register/react';

export default function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <div className="ReloadPrompt-container">
            {(offlineReady || needRefresh) && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    left: '20px',
                    zIndex: 1000,
                    background: '#1e293b',
                    border: '1px solid var(--color-primary)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    maxWidth: '400px',
                    margin: '0 auto'
                }}>
                    <div style={{ marginBottom: '0.2rem', fontWeight: 'bold' }}>
                        {offlineReady ? 'App ready to work offline' : 'App update available'}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        {offlineReady ? 'Content is cached for offline use.' : 'Click on reload button to update.'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {needRefresh && (
                            <button
                                className="btn"
                                onClick={() => updateServiceWorker(true)}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                            >
                                Reload
                            </button>
                        )}
                        <button
                            className="btn-secondary"
                            onClick={close}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
