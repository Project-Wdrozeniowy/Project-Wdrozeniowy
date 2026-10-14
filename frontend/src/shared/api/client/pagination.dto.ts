/** Shared page shape returned by paginated backend endpoints. */
// TODO(PWDRZ-130): Generate API DTOs from the backend OpenAPI contract to keep them synchronized.
export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
