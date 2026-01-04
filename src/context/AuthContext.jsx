import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState(true); // Default to true until proven false

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Probe read to check if user is allowed
                try {
                    const q = query(collection(db, 'users', currentUser.uid, 'habits'), limit(1));
                    await getDocs(q);
                    setIsAllowed(true);
                } catch (error) {
                    console.error("Access check error:", error);
                    if (error.code === 'permission-denied') {
                        setIsAllowed(false);
                    } else {
                        // For other errors (offline etc), assume allowed for now so we don't block valid users unnecessarily
                        // or handles as needed. But permission-denied is the specific target.
                        setIsAllowed(true);
                    }
                }
            } else {
                setIsAllowed(true);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        loading,
        isAllowed
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
