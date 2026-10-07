import { createStore } from 'zustand';
import { createAuthSlice, type AuthSlice } from '../authSlice';
import type { UserProfile } from '@/shared/types';
import { tokenMemory } from '@/lib/tokenMemory';

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
  tokenMemory.set(null);
});

describe('authSlice >-65 initial state', () => {
  it('starts as a not-yet-initialised guest', () => {
    const { user, isAuthenticated, isInitialized } = makeStore().getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isInitialized).toBe(false);
  });
});

describe('authSlice >-65 setAuth', () => {
  it('stores the user, marks the session authenticated and initialised', () => {
    const store = makeStore();
    store.getState().setAuth(mockUser, 'access-token');
    const { user, isAuthenticated, isInitialized } = store.getState();
    expect(user).toEqual(mockUser);
    expect(isAuthenticated).toBe(true);
    expect(isInitialized).toBe(true);
  });

  it('keeps the access token in memory only, never in storage', () => {
    const store = makeStore();
    store.getState().setAuth(mockUser, 'access-token');
    expect(tokenMemory.get()).toBe('access-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});

describe('authSlice >-65 setInitialized', () => {
  it('marks restore as finished without authenticating', () => {
    const store = makeStore();
    store.getState().setInitialized();
    expect(store.getState().isInitialized).toBe(true);
    expect(store.getState().isAuthenticated).toBe(false);
  });
});

describe('authSlice >-65 logout', () => {
  it('clears the user and the in-memory token but stays initialised', () => {
    const store = makeStore();
    store.getState().setAuth(mockUser, 'access-token');
    store.getState().logout();
    const { user, isAuthenticated, isInitialized } = store.getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isInitialized).toBe(true);
    expect(tokenMemory.get()).toBeNull();
  });
});
