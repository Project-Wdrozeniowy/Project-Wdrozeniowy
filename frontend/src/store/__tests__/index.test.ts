import { useStore } from '../index';
import type { UserProfile } from '@/shared/types';
import { tokenMemory } from '@/lib/tokenMemory';

const mockUser: UserProfile = {
  id: 42,
  username: 'combineduser',
  displayName: 'Combined User',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  tokenMemory.set(null);
  // Reset store state between tests
  useStore.setState({
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    isLoading: false,
  });
});

describe('Combined store >-65', () => {
  it('exposes setLoading from UISlice', () => {
    useStore.getState().setLoading(true);
    expect(useStore.getState().isLoading).toBe(true);
  });

  it('exposes setAuth from AuthSlice', () => {
    useStore.getState().setAuth(mockUser, 'access-xyz');
    const state = useStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(tokenMemory.get()).toBe('access-xyz');
    expect(state.isAuthenticated).toBe(true);
  });

  it('exposes logout from AuthSlice', () => {
    useStore.getState().setAuth(mockUser, 'access-xyz');
    useStore.getState().logout();
    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().isAuthenticated).toBe(false);
  });

  it('UISlice and AuthSlice state are independent', () => {
    useStore.getState().setLoading(true);
    useStore.getState().setAuth(mockUser, 'access-xyz');
    expect(useStore.getState().isLoading).toBe(true);
    expect(useStore.getState().isAuthenticated).toBe(true);
  });
});
