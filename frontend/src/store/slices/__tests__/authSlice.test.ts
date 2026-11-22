import { createStore } from 'zustand';
import { createAuthSlice, type AuthSlice } from '../authSlice';

function makeStore() {
  return createStore<AuthSlice>()(createAuthSlice);
}

describe('authSlice: initial state', () => {
  it('starts as a not-yet-initialised session that is being checked, with nobody signed in', () => {
    const { isAuthenticated, isInitialized, sessionStatus } = makeStore().getState();
    expect(isAuthenticated).toBe(false);
    expect(isInitialized).toBe(false);
    expect(sessionStatus).toBe('checking');
  });

  it('holds no user: who is signed in is the query cache, never a copy here', () => {
    expect(makeStore().getState()).not.toHaveProperty('user');
  });
});

describe('authSlice: setAuthenticated', () => {
  it('marks the session authenticated and initialised', () => {
    const store = makeStore();
    store.getState().setAuthenticated();
    expect(store.getState()).toMatchObject({
      isAuthenticated: true,
      isInitialized: true,
      sessionStatus: 'authenticated',
    });
  });

  it('stores nothing in the browser', () => {
    makeStore().getState().setAuthenticated();
    expect(localStorage.length).toBe(0);
  });
});

describe('authSlice: setInitialized', () => {
  it('marks the first check as finished without authenticating', () => {
    const store = makeStore();
    store.getState().setInitialized();
    expect(store.getState()).toMatchObject({
      isInitialized: true,
      isAuthenticated: false,
      sessionStatus: 'guest',
    });
  });

  it('keeps an authenticated session authenticated', () => {
    const store = makeStore();
    store.getState().setAuthenticated();
    store.getState().setInitialized();
    expect(store.getState().sessionStatus).toBe('authenticated');
  });
});

describe('authSlice: setSessionStatus', () => {
  it.each([
    ['checking', false],
    ['guest', true],
    ['error', true],
  ] as const)('%s: nobody is signed in, and initialised is %s', (status, initialised) => {
    const store = makeStore();
    store.getState().setAuthenticated();
    store.getState().setSessionStatus(status);
    expect(store.getState()).toMatchObject({
      isAuthenticated: false,
      isInitialized: initialised,
      sessionStatus: status,
    });
  });
});

describe('authSlice: logout', () => {
  it('ends the session but stays initialised', () => {
    const store = makeStore();
    store.getState().setAuthenticated();
    store.getState().logout();
    expect(store.getState()).toMatchObject({
      isAuthenticated: false,
      isInitialized: true,
      sessionStatus: 'guest',
    });
  });
});
