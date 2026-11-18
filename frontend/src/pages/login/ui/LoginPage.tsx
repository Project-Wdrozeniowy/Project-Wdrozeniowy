import LoginForm from '@/features/sign-in/LoginForm';
import OrbitaLogo from '@/shared/ui/OrbitaLogo';

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center gap-2 mb-6">
        <OrbitaLogo size={64} />
        <h1 className="text-fg font-bold text-4xl text-center mt-2">Welcome Back</h1>
        <p className="text-fg-subtle text-base text-center">Sign in to your account to continue</p>
      </div>

      <LoginForm />
    </div>
  );
}
