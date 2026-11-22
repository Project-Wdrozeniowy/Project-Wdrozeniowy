import { Toaster } from 'sonner';

/**
 * Toasts sit at the bottom right, not the top: at the top they covered the bell and the account
 * button of the header for the four seconds they last. On a phone they clear the bottom tab bar.
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      mobileOffset={{
        bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.5rem)',
        left: 16,
        right: 16,
      }}
      richColors
      closeButton
      duration={4000}
    />
  );
}
