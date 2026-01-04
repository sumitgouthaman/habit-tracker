import { auth } from '../lib/firebase';
import { deleteUserData } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogOut } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [deleting, setDeleting] = useState(false);

    const handleSignOut = () => {
        auth.signOut();
        navigate('/login');
    };

    const handleDeleteData = async () => {
        if (!confirm("Are you sure? This will delete ALL your habits and history. This cannot be undone.")) {
            return;
        }

        setDeleting(true);
        try {
            await deleteUserData(user.uid);
            alert("All data deleted.");
            window.location.reload(); // Refresh to clear state
        } catch (err) {
            console.error(err);
            alert("Failed to delete data.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={{ padding: '1.5rem', paddingBottom: '100px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Settings</h2>

            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Account</h3>
                <p style={{ color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
                    Signed in as {user?.email}
                </p>

                <button
                    onClick={handleSignOut}
                    className="btn-secondary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <LogOut size={18} /> Sign Out
                </button>
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
