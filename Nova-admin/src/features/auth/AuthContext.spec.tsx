import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import api from '../../lib/api';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const adminUser = {
  id: 7,
  username: 'Nova Admin',
  email: 'admin@example.com',
  role: 'admin' as const,
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    mockedApi.post.mockResolvedValue({ data: {} });
  });

  it('requires consumers to be wrapped in AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });

  it('finishes loading when there is no saved session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.hasRole(['admin'])).toBe(false);
  });

  it('restores and validates an admin session from storage', async () => {
    localStorage.setItem('admin_token', 'saved.token');
    localStorage.setItem('admin_user', '{"stale":true}');
    mockedApi.get.mockResolvedValueOnce({ data: adminUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual(adminUser));
    expect(result.current.token).toBe('saved.token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasRole(['staff', 'admin'])).toBe(true);
    expect(localStorage.getItem('admin_user')).toBeNull();
    expect(mockedApi.get).toHaveBeenCalledWith('/user/me');
  });

  it.each([
    ['an invalid token', 'not valid!', adminUser],
    ['an invalid profile', 'valid.token', { ...adminUser, id: 0 }],
    ['a customer profile', 'valid.token', { ...adminUser, role: 'customer' }],
  ])('clears %s while restoring a session', async (_label, token, profile) => {
    localStorage.setItem('admin_token', token);
    mockedApi.get.mockResolvedValueOnce({ data: profile });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('admin_token')).toBeNull();
    expect(mockedApi.post).toHaveBeenCalledWith('/logout');
  });

  it('logs in, exposes roles, and logs out', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { accessToken: 'fresh.token' } });
    mockedApi.get.mockResolvedValueOnce({ data: adminUser });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.login('admin@example.com', 'secret'));

    expect(mockedApi.post).toHaveBeenCalledWith('/login', {
      email: 'admin@example.com',
      password: 'secret',
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/user/me', {
      headers: { Authorization: 'Bearer fresh.token' },
    });
    expect(localStorage.getItem('admin_token')).toBe('fresh.token');
    expect(result.current.user).toEqual(adminUser);
    expect(result.current.hasRole(['admin'])).toBe(true);

    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(mockedApi.post).toHaveBeenLastCalledWith('/logout');
  });

  it.each([
    ['a non-object login response', null, adminUser, 'Invalid login response'],
    ['an invalid login payload', { accessToken: null }, adminUser, 'Invalid access token'],
    [
      'an invalid profile',
      { accessToken: 'fresh.token' },
      { ...adminUser, email: 'invalid' },
      'Invalid user data',
    ],
    [
      'a customer profile',
      { accessToken: 'fresh.token' },
      { ...adminUser, role: 'customer' },
      'Access denied: customers cannot access the admin panel.',
    ],
  ])('rejects %s', async (_label, loginPayload, profile, message) => {
    mockedApi.post.mockResolvedValueOnce({ data: loginPayload });
    mockedApi.get.mockResolvedValueOnce({ data: profile });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.login('admin@example.com', 'secret');
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(message);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('uses the API error message when login is rejected by Axios', async () => {
    const apiError = { message: 'request failed', response: { data: { message: 'Wrong credentials' } } };
    mockedApi.post.mockRejectedValueOnce(apiError);
    vi.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.login('admin@example.com', 'wrong')).rejects.toThrow(
      'Wrong credentials',
    );
  });
});
