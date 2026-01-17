import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../context/HabitContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogOut, Download, Upload, LogIn, Cloud } from 'lucide-react';

export default function Settings() {
    const { user, isGuest, setGuestMode } = useAuth();
    const { storage } = useHabits();
    const navigate = useNavigate();
    const [deleting, setDeleting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    const handleSignOut = () => {
        auth.signOut();
        navigate('/login');
    };

    const handleSignIn = () => {
        // Don't clear guest mode here - Login.jsx will handle sync
        navigate('/login');
    };

    const handleDeleteData = async () => {
        if (!confirm("Are you sure? This will delete ALL your habits and history. This cannot be undone.")) {
            return;
        }

        setDeleting(true);
        try {
            await storage.deleteUserData();
            alert("All data deleted.");
            window.location.reload(); // Refresh to clear state
        } catch (err) {
            console.error(err);
            alert("Failed to delete data.");
        } finally {
            setDeleting(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const data = await storage.exportUserData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const href = URL.createObjectURL(blob);

            // Create imaginary link and click it
            const link = document.createElement('a');
            link.href = href;
            link.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export data.");
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm("This will overwrite existing habits with the same ID from the file. Are you sure?")) {
            event.target.value = null; // Reset input
            return;
        }

        setImporting(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);
                await storage.importUserData(json);
                alert("Import successful!");
                window.location.reload(); // Refresh to ensure valid state
            } catch (err) {
                console.error("Import failed:", err);
                alert("Failed to import data: " + err.message);
            } finally {
                setImporting(false);
                event.target.value = null; // Reset input
            }
        };

        reader.onerror = () => {
            alert("Failed to read file");
            setImporting(false);
            event.target.value = null; // Reset input
        };

        reader.readAsText(file);
    };

    return (
        <div style={{ padding: '1.5rem', paddingBottom: '100px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Settings</h2>

            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Account</h3>

                {isGuest ? (
                    <>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-text-dim)',
                            marginBottom: '1rem'
                        }}>
                            <Cloud size={16} style={{ opacity: 0.7 }} />
                            <span>Using local storage (not signed in)</span>
                        </div>

                        <button
                            onClick={handleSignIn}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s',
                                fontSize: '1rem',
                                fontWeight: 500
                            }}
                        >
                            <LogIn size={20} /> Sign In to Sync
                        </button>
                        <p style={{
                            fontSize: '0.85rem',
                            color: 'var(--color-text-dim)',
                            marginTop: '0.75rem',
                            textAlign: 'center'
                        }}>
                            Sign in to sync your habits across devices
                        </p>
                    </>
                ) : (
                    <>
                        <p style={{ color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
                            Signed in as {user?.email}
                        </p>

                        <button
                            onClick={handleSignOut}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'var(--color-text)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s',
                                fontSize: '1rem',
                                fontWeight: 500
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.03)'}
                        >
                            <LogOut size={20} /> Sign Out
                        </button>
                    </>
                )}
            </div>

            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Data Management</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {/* Export Card */}
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            textAlign: 'center', padding: '2rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: 'inherit'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.03)'}
                    >
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '1rem'
                        }}>
                            <Download size={24} />
                        </div>
                        <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Export Data</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 0 }}>
                            {exporting ? 'Generating JSON...' : 'Download a backup of your habits and history (JSON).'}
                        </p>
                    </button>

                    {/* Import Card */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            disabled={importing}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                opacity: 0, cursor: 'pointer', zIndex: 10
                            }}
                        />
                        <button
                            disabled={importing}
                            style={{
                                width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                textAlign: 'center', padding: '2rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                transition: 'all 0.2s',
                                color: 'inherit'
                            }}
                        >
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '1rem'
                            }}>
                                <Upload size={24} />
                            </div>
                            <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Import Data</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 0 }}>
                                {importing ? 'Restoring...' : 'Restore habits from a backup file (Overwrites existing data).'}
                            </p>
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ borderColor: 'var(--color-danger)' }}>
                <h3 style={{ marginBottom: '1rem', color: '#fca5a5' }}>Danger Zone</h3>
                <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Deleting your data is permanent and cannot be undone.
                </p>

                <button
                    onClick={handleDeleteData}
                    className="btn"
                    disabled={deleting}
                    style={{
                        width: '100%',
                        backgroundColor: 'rgba(220, 38, 38, 0.2)',
                        border: '1px solid rgba(220, 38, 38, 0.5)',
                        color: '#fca5a5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <Trash2 size={18} /> {deleting ? 'Deleting...' : 'Delete All Data'}
                </button>
            </div>
        </div>
    );
}

