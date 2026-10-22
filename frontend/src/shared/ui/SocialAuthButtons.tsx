/**
 * The "Or continue with" divider and the provider buttons of the sign-in and sign-up forms.
 * The buttons do nothing yet: there is no social sign-in contract.
 */
export default function SocialAuthButtons() {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-500 text-xs">Or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['Google', 'GitHub', 'Discord'].map((provider) => (
          <button
            key={provider}
            type="button"
            className="flex items-center justify-center py-2.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 text-xs text-gray-700 font-medium"
          >
            {provider}
          </button>
        ))}
      </div>
    </>
  );
}
