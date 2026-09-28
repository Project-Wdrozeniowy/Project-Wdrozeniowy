import { createStore } from 'zustand';
import { createAuthSlice, type AuthSlice } from '../authSlice';
import type { UserProfile } from '@/shared/types';

const mockUser: UserProfile = {
  id: 1,
  username: 'johndoe',
  displayName: 'John Doe',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: new Date().toISOString(),
};

function makeStore() {
  return createStore<AuthSlice>()(createAuthSlice);
}

beforeEach(() => {
  localStorage.clear();
});

describe('authSlice >-65 initial state', () => {
  it('user is null by default', () => {
    const store = makeStore();
    expect(store.getState().user).toBeNull();
  });

  it('accessToken is null when localStorage is empty', () => {
    const store = makeStore();
    expect(store.getState().accessToken).toBeNull();
  });

  it('isAuthenticated is false when no token in localStorage', () => {
    const store = makeStore();
    expect(store.getState().isAuthenticated).toBe(false);
  });

  it('reads accessToken from localStorage on initialisation', () => {
    localStorage.setItem('accessToken', 'stored-token');
    const store = makeStore();
    expect(store.getState().accessToken).toBe('stored-token');
    expect(store.getState().isAuthenticated).toBe(true);
  });
});

describe('authSlice >-65 setAuth', () => {
  it('updates user, accessToken, refreshToken and isAuthenticated', () => {
    const store = makeStore();
    store.getState().setAuth(mockUser, 'access-token', 'refresh-token');
    const { user, accessToken, refreshToken, isAuthenticated } = store.getState();
    expect(user).toEqual(mockUser);
    expect(accessToken).toBe('access-token');
    expect(refreshToken).toBe('refresh-token');
    expect(isAuthenticated).toBe(true);
  });

  it('writes tokens to localStorage', () => {
    const store = makeStore();
    store.getState().setAuth(mockUser, 'access-token', 'refresh-token');
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });
});

describe('authSlice >-65 logout', () => {
  it('resets user, tokens and isAuthenticated to defaults', () => {
    const store = makeStore();
    store.getState().setAuth(mockUser, 'access-token', 'refresh-token');
    store.getState().logout();
    const { user, accessToken, refreshToken, isAuthenticated } = store.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('removes tokens from localStorage', () => {
    const store = makeStore();
    store.getState().setAuth(mockUser, 'access-token', 'refresh-token');
    store.getState().logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
