import { useStore } from '../index';
import type { UserProfile } from '@/types';

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
  localStorage.clear();
  // Reset store state between tests
  useStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

describe('Combined store >-65', () => {
  it('exposes setLoading from UISlice', () => {
    useStore.getState().setLoading(true);
    expect(useStore.getState().isLoading).toBe(true);
  });

  it('exposes setAuth from AuthSlice', () => {
    useStore.getState().setAuth(mockUser, 'access-xyz', 'refresh-xyz');
    const state = useStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-xyz');
    expect(state.isAuthenticated).toBe(true);
  });

  it('exposes logout from AuthSlice', () => {
    useStore.getState().setAuth(mockUser, 'access-xyz', 'refresh-xyz');
    useStore.getState().logout();
    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().isAuthenticated).toBe(false);
  });

  it('UISlice and AuthSlice state are independent', () => {
    useStore.getState().setLoading(true);
    useStore.getState().setAuth(mockUser, 'access-xyz', 'refresh-xyz');
    expect(useStore.getState().isLoading).toBe(true);
    expect(useStore.getState().isAuthenticated).toBe(true);
  });
});
