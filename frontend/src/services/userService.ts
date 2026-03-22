import { apiClient } from './api';
import { User, ApiResponse } from '../types';

export const userService = {
  // Specify the return type
  getUsers: (): Promise<ApiResponse<User[]>> => 
    apiClient.get<ApiResponse<User[]>>('/users'),
  
  getUser: (id: string): Promise<ApiResponse<User>> => 
    apiClient.get<ApiResponse<User>>(`/users/${id}`),
  
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<User>> => 
    apiClient.post<ApiResponse<User>>('/users', data),
  
  updateUser: (id: string, data: Partial<User>): Promise<ApiResponse<User>> => 
    apiClient.patch<ApiResponse<User>>(`/users/${id}`, data),
  
  deleteUser: (id: string): Promise<ApiResponse<null>> => 
    apiClient.delete<ApiResponse<null>>(`/users/${id}`),
};