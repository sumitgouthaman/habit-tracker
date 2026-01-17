import { useState } from 'react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasLocalData, getLocalHabitsForSync, clearLocalData, syncLocalToFirebase } from '../lib/storage';
import * as firebaseDb from '../lib/db';

export default function Login() {
    const [error, setError] = useState('');
    const [syncing, setSyncing] = useState(false);
    const navigate = useNavigate();
    const { setGuestMode, isGuest } = useAuth();

    const handleGoogleSignIn = async () => {
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);

            // Check if there's local data to sync
            if (hasLocalData()) {
                setSyncing(true);
                const localHabits = getLocalHabitsForSync().filter(h => !h.archived);

                if (localHabits.length > 0) {
                    try {
                        // Check if user has existing Firebase data
                        const existingHabits = await firebaseDb.getUserHabits(result.user.uid);

                        if (existingHabits.length > 0) {
                            // Prompt user: merge or discard local?
                            const shouldMerge = confirm(
                                `You have ${localHabits.length} local habit(s) and ${existingHabits.length} cloud habit(s).\n\n` +
                                'Click OK to merge local habits with cloud data.\n' +
                                'Click Cancel to discard local habits and use cloud data only.'
                            );

                            if (shouldMerge) {
                                await syncLocalToFirebase(result.user.uid, localHabits);
                            }
                        } else {
                            // No existing cloud data, just upload local
                            await syncLocalToFirebase(result.user.uid, localHabits);
                        }
                    } catch (syncError) {
                        console.error('Sync error:', syncError);
                        // Don't block login on sync failure
                    }
                }

                // Clear local storage after sync attempt
                clearLocalData();
                setSyncing(false);
            }

            navigate('/');
        } catch (err) {
            console.error(err);
            setSyncing(false);
            setError("Failed to sign in with Google. " + err.message);
        }
    };

    const handleContinueWithoutSignIn = () => {
        setGuestMode(true);
        navigate('/');
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '1.5rem' }}>Welcome</h1>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        color: '#fca5a5',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        textAlign: 'left'
                    }}>
                        {error}
                    </div>
                )}

                {syncing ? (
                    <div style={{ padding: '2rem' }}>
                        <p style={{ color: 'var(--color-text-dim)' }}>Syncing your local data...</p>
                    </div>
                ) : (
                    <>
                        <p style={{ color: 'var(--color-text-dim)', marginBottom: '2rem' }}>
                            Sign in to sync your habits across devices.
                        </p>

                        <button
                            onClick={handleGoogleSignIn}
                            className="btn"
                            style={{
                                width: '100%',
                                background: 'white',
                                color: '#333',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px'
                            }}
                        >
                            {/* Simple G Icon SVG */}
                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Sign in with Google
                        </button>

                        <div style={{ margin: '1.5rem 0', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                            — or —
                        </div>

                        <button
                            onClick={handleContinueWithoutSignIn}
                            className="btn btn-secondary"
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            Continue without signing in
                        </button>
                        <p style={{
                            color: 'var(--color-text-dim)',
                            fontSize: '0.85rem',
                            marginTop: '0.75rem'
                        }}>
                            Your data will be stored locally on this device
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

