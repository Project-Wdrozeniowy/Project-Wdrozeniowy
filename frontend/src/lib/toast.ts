import { toast as sonnerToast } from 'sonner';

/** Shared id for API failure toasts: a new one replaces the previous instead of stacking. */
export const API_ERROR_TOAST_ID = 'api-error';

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string, id?: string) => sonnerToast.error(message, { id }),
  info: (message: string) => sonnerToast.info(message),
  warning: (message: string) => sonnerToast.warning(message),
};
