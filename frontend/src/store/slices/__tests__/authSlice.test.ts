import { createStore } from 'zustand';
import { createAuthSlice, type AuthSlice } from '../authSlice';
import type { User } from '@/types';

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeStore() {
  return createStore<AuthSlice>()(createAuthSlice);
}

beforeEach(() => {
  localStorage.clear();
});

describe('authSlice – initial state', () => {
  it('user is null by default', () => {
    const store = makeStore();
    expect(store.getState().user).toBeNull();
  });

  it('token is null when localStorage is empty', () => {
    const store = makeStore();
    expect(store.getState().token).toBeNull();
  });

  it('isAuthenticated is false when no token in localStorage', () => {
    const store = makeStore();
    expect(store.getState().isAuthenticated).toBe(false);
  });

  it('reads token from localStorage on initialisation', () => {
    localStorage.setItem('token', 'stored-token');
    const store = makeStore();
    expect(store.getState().token).toBe('stored-token');
    expect(store.getState().isAuthenticated).toBe(true);
  });
});

describe('authSlice – setUser', () => {
  it('updates user, token and isAuthenticated', () => {
    const store = makeStore();
    store.getState().setUser(mockUser, 'my-token');
    const { user, token, isAuthenticated } = store.getState();
    expect(user).toEqual(mockUser);
    expect(token).toBe('my-token');
    expect(isAuthenticated).toBe(true);
  });

  it('writes token to localStorage', () => {
    const store = makeStore();
    store.getState().setUser(mockUser, 'my-token');
    expect(localStorage.getItem('token')).toBe('my-token');
  });
});

describe('authSlice – logout', () => {
  it('resets user, token and isAuthenticated to defaults', () => {
    const store = makeStore();
    store.getState().setUser(mockUser, 'my-token');
    store.getState().logout();
    const { user, token, isAuthenticated } = store.getState();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('removes token from localStorage', () => {
    const store = makeStore();
    store.getState().setUser(mockUser, 'my-token');
    store.getState().logout();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
