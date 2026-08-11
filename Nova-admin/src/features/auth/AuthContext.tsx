import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (roles: ('customer' | 'staff' | 'admin')[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Optional: verify/fetch profile from server to ensure it is valid
        api.get(`/user/${parsedUser.id}`)
          .then((res) => {
            const freshUser = res.data;
            setUser(freshUser);
            localStorage.setItem('admin_user', JSON.stringify(freshUser));
          })
          .catch(() => {
            // Token might be invalid, but we can fallback to logout
          });
      } catch (e) {
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/login', { email, password });
      const { accessToken, userId } = response.data;

      localStorage.setItem('admin_token', accessToken);
      setToken(accessToken);

      // Fetch full profile to get username, email, role
      const profileResponse = await api.get(`/user/${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = profileResponse.data;

      if (profile.role === 'customer') {
        throw new Error('Access denied: customers cannot access the admin panel.');
      }

      localStorage.setItem('admin_user', JSON.stringify(profile));
      setUser(profile);
    } catch (error: any) {
      logout();
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      api.post('/logout').catch(() => {});
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  const hasRole = (roles: ('customer' | 'staff' | 'admin')[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
        hasRole,
      }}
    >
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
