/** RFC 9457 ProblemDetail returned by the backend. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Field-level validation errors returned by Spring Validation. */
  errors?: Record<string, string>;
}
