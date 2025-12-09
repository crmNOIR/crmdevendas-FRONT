import { useState, useEffect } from 'react';
import { api, User } from '@/lib/api';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await api.getMe();
                setUser(userData);
            } catch (err) {
                setError('Failed to fetch user data');
                console.error('Error fetching user:', err);
            } finally {
                setLoading(false);
            }
        };

        if (api.getToken()) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    return { user, loading, error };
}
