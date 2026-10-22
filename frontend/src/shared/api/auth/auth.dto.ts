export interface LoginRequest {
  username: string;
  password: string;
}

/** `POST /auth/register`. */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  /**
   * Public name. Left out when the user gives none, then the username is shown instead. Never
   * an empty or blank string: the API rejects that with 400.
   */
  displayName?: string;
}

/** The refresh token is not part of the body: it travels as an HttpOnly cookie. */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
