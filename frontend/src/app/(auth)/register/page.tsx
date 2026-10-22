import RegisterForm from '@/features/sign-up/RegisterForm';
import OrbitaLogo from '@/shared/ui/OrbitaLogo';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-col items-center gap-2 mb-6">
        <OrbitaLogo size={85} />
        <h1 className="text-gray-900 font-bold text-4xl text-center mt-2">Join Our Community</h1>
        <p className="text-gray-500 text-base text-center">
          Create your account and start sharing your ideas
        </p>
      </div>

      <RegisterForm />
    </div>
  );
}
