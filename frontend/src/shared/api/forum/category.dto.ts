// PROVISIONAL PWDRZ-141: category writes remain hidden 501 operations.
export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  visible?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  visible?: boolean;
}
