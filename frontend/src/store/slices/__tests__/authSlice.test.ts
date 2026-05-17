import { createStore } from 'zustand';
import { createAuthSlice, type AuthSlice } from '../authSlice';
import type { AuthUserInfo } from '@/shared/types';
import { tokenMemory } from '@/lib/tokenMemory';

const mockUser: AuthUserInfo = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
};

function makeStore() {
  return createStore<AuthSlice>()(createAuthSlice);
}

beforeEach(() => {
  tokenMemory.set(null);
});

describe('authSlice – initial state', () => {
  it('user is null by default', () => {
    const store = makeStore();
    expect(store.getState().user).toBeNull();
  });

  it('token is null by default', () => {
    const store = makeStore();
    expect(store.getState().token).toBeNull();
  });

  it('isAuthenticated is false by default', () => {
    const store = makeStore();
    expect(store.getState().isAuthenticated).toBe(false);
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

  it('stores token in memory', () => {
    const store = makeStore();
    store.getState().setUser(mockUser, 'my-token');
    expect(tokenMemory.get()).toBe('my-token');
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

  it('clears token from memory', () => {
    const store = makeStore();
    store.getState().setUser(mockUser, 'my-token');
    store.getState().logout();
    expect(tokenMemory.get()).toBeNull();
  });
});
