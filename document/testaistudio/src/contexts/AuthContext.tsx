import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useUI } from './UIContext';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: string | null;
    companyId: string | null;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useUI();

    const refreshProfile = async () => {
        let currentUserId = user?.id;
        if (!currentUserId) {
            const { data } = await supabase.auth.getUser();
            currentUserId = data?.user?.id;
        }
        if (!currentUserId) return;
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, company_id')
                .eq('id', currentUserId)
                .single();

            if (error) throw error;
            if (data) {
                setRole(data.role);
                setCompanyId(data.company_id);
            }
        } catch (err: any) {
            console.error("Profile Fetch Error:", err);
            showToast(`DB Error: ${err.message || JSON.stringify(err)}`, 'error');
        }
    };

    useEffect(() => {
        let mounted = true;

        async function fetchProfile(userId: string) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, company_id')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                if (mounted && data) {
                    setRole(data.role);
                    setCompanyId(data.company_id);
                }
            } catch (err: any) {
                console.error("Profile Fetch Error:", err);
                if (mounted) showToast(`DB Error: ${err.message || JSON.stringify(err)}`, 'error');
            }
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id).finally(() => setLoading(false));
                } else {
                    setRole(null);
                    setCompanyId(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [showToast]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, role, companyId, signOut, refreshProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
