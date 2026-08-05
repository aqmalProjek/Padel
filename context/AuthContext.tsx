// context/AuthContext.tsx (Contoh Pengambilan Role)
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
    user: any;
    role: string | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUserData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUser(session.user);

                // Fetch role dari tabel profiles / users
                const { data: profile } = await supabase
                    .from('profiles') // 👈 Ubah jadi 'profiles'
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setRole(profile.role);
                }
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        };

        getUserData();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                const { data: profile } = await supabase
                    .from('profiles') // 👈 Ubah jadi 'profiles'
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile) setRole(profile.role);
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);