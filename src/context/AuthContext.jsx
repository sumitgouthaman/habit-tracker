import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { isGuestMode, setGuestMode as setGuestModeStorage, clearLocalData } from "../lib/localDb";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState(true); // Default to true until proven false
    const [isGuest, setIsGuest] = useState(() => isGuestMode());

    const setGuestMode = useCallback((value) => {
        setIsGuest(value);
        setGuestModeStorage(value);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Clear guest mode when user logs in
                setGuestMode(false);

                // Probe read to check if user is allowed
                try {
                    const q = query(collection(db, 'users', currentUser.uid, 'habits'), limit(1));
                    await getDocs(q);
                    setIsAllowed(true);

                    // User passed allowlist check - NOW it's safe to clear local data
                    clearLocalData();
                } catch (error) {
                    console.error("Access check error:", error);
                    if (error.code === 'permission-denied') {
                        setIsAllowed(false);
                        // DON'T clear local data - user will be logged out
                        // and they should keep their local habits
                        // Auto-logout after showing message briefly
                        setTimeout(() => {
                            signOut(auth);
                        }, 3000);
                    } else {
                        // For other errors (offline etc), assume allowed for now
                        setIsAllowed(true);
                    }
                }
            } else {
                setIsAllowed(true);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [setGuestMode]);

    const value = {
        user,
        loading,
        isAllowed,
        isGuest,
        setGuestMode
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}


