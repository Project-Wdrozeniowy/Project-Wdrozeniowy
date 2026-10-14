export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** The refresh token is not part of the body: it travels as an HttpOnly cookie. */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
