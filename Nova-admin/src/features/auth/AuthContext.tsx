import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';
import api from '../../lib/api';

type UserRole = 'customer' | 'staff' | 'admin';

interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

const USER_ROLES = new Set<UserRole>(['customer', 'staff', 'admin']);
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{1,4096}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_. -]{1,100}$/;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[A-Za-z0-9.-]{1,255}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parsePositiveInteger = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return value;
};

const parseAccessToken = (value: unknown): string => {
  if (typeof value !== 'string' || !ACCESS_TOKEN_PATTERN.test(value)) {
    throw new Error('Invalid access token');
  }

  return value;
};

const parseUser = (value: unknown): User => {
  if (
    !isRecord(value) ||
    typeof value.username !== 'string' ||
    !USERNAME_PATTERN.test(value.username) ||
    typeof value.email !== 'string' ||
    !EMAIL_PATTERN.test(value.email) ||
    typeof value.role !== 'string' ||
    !USER_ROLES.has(value.role as UserRole)
  ) {
    throw new Error('Invalid user data');
  }

  return {
    id: parsePositiveInteger(value.id, 'user ID'),
    username: value.username,
    email: value.email,
    role: value.role as UserRole,
  };
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      api.post('/logout').catch(() => {});
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        const parsedUser = parseUser(JSON.parse(savedUser) as unknown);
        setUser(parsedUser);

        // Verify the stored session against the authenticated server identity.
        api.get('/user/me')
          .then((res) => {
            const freshUser = parseUser(res.data as unknown);
            setUser(freshUser);
            localStorage.setItem('admin_user', JSON.stringify(freshUser));
          })
          .catch(() => {
            // Token might be invalid, but we can fallback to logout
          });
      } catch {
        logout();
      }
    }
    setIsLoading(false);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/login', { email, password });
      if (!isRecord(response.data)) {
        throw new Error('Invalid login response');
      }
      const accessToken = parseAccessToken(response.data.accessToken);

      localStorage.setItem('admin_token', accessToken);
      setToken(accessToken);

      // Fetch full profile to get username, email, role
      const profileResponse = await api.get('/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = parseUser(profileResponse.data as unknown);

      if (profile.role === 'customer') {
        throw new Error('Access denied: customers cannot access the admin panel.');
      }

      localStorage.setItem('admin_user', JSON.stringify(profile));
      setUser(profile);
    } catch (error) {
      logout();
      let message = 'Login failed';
      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      throw new Error(message, { cause: error });
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const hasRole = useCallback((roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(token),
      isLoading,
      hasRole,
    }),
    [user, token, login, logout, isLoading, hasRole],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
