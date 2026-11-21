import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/features/sign-in/login.schema';
import type { LoginFormData } from '@/features/sign-in/login.schema';
import { PASSWORD_RECOVERY_UNAVAILABLE_TEXT } from '@/features/sign-in/login.const';
import { useSignIn } from '@/features/sign-in/useSignIn';
import { cn } from '@/shared/lib/cn';
import FormField from '@/shared/ui/FormField';
import SocialSignInNotice from '@/shared/ui/SocialSignInNotice';
import { getFieldControlProps } from '@/shared/ui/fieldA11y';

export default function LoginForm() {
  const { signIn, serverError } = useSignIn();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form
      onSubmit={handleSubmit(signIn)}
      className="bg-surface rounded-xl p-8 flex flex-col gap-5 border border-line"
    >
      {serverError && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded">
          {serverError}
        </div>
      )}

      <FormField label="Username" id="login-username" error={errors.username?.message}>
        <input
          {...register('username')}
          {...getFieldControlProps({ id: 'login-username', hasError: Boolean(errors.username) })}
          type="text"
          placeholder="your_username"
          autoComplete="username"
          className={cn('input', errors.username && 'ring-2 ring-red-500')}
        />
      </FormField>

      <FormField
        label="Password"
        id="login-password"
        hint={PASSWORD_RECOVERY_UNAVAILABLE_TEXT}
        error={errors.password?.message}
      >
        <input
          {...register('password')}
          {...getFieldControlProps({
            id: 'login-password',
            hasHint: true,
            hasError: Boolean(errors.password),
          })}
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          className={cn('input', errors.password && 'ring-2 ring-red-500')}
        />
      </FormField>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded transition-colors"
      >
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </button>

      <SocialSignInNotice />

      <p className="text-fg-subtle text-sm text-center">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-accent hover:underline font-semibold">
          Sign Up
        </Link>
      </p>
    </form>
  );
}
