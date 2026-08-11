import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api from './api';

describe('API Axios Client Interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should inject Authorization header when token exists in localStorage', async () => {
    localStorage.setItem('admin_token', 'mocked-jwt-token');

    // Trigger request interceptor manually
    const config = { headers: {} as any };
    // @ts-ignore
    const interceptor = api.interceptors.request.handlers[0].fulfilled;
    const resultConfig = await interceptor(config);

    expect(resultConfig.headers.Authorization).toBe('Bearer mocked-jwt-token');
  });

  it('should not inject Authorization header if token does not exist in localStorage', async () => {
    const config = { headers: {} as any };
    // @ts-ignore
    const interceptor = api.interceptors.request.handlers[0].fulfilled;
    const resultConfig = await interceptor(config);

    expect(resultConfig.headers.Authorization).toBeUndefined();
  });
});
