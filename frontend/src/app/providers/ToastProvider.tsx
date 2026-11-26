import { Toaster } from 'sonner';

/**
 * Toasts sit at the bottom right, not the top: at the top they covered the bell and the account
 * button of the header for the four seconds they last. On a phone they clear the bottom tab bar.
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      offset={{
        bottom: 'calc(var(--consent-panel-height, 0px) + var(--mobile-nav-height, 0px) + 16px)',
      }}
      mobileOffset={{
        bottom: 'calc(var(--consent-panel-height, 0px) + var(--mobile-nav-height, 0px) + 8px)',
        left: 16,
        right: 16,
      }}
      richColors
      closeButton
      duration={4000}
    />
  );
}
