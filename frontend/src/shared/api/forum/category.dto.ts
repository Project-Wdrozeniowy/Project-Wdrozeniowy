export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  visible: boolean;
  createdAt: string;
}

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
