// API Response Types
export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  status: number;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}