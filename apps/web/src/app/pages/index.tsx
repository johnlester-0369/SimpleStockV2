import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from '@/infra/modules/auth/lib/admin-auth-client.lib'
import {
  loginSchema,
  type LoginFormValues,
} from '@/infra/modules/auth/auth.schema'
import Button from '@/app/components/ui/buttons/Button'
import Input from '@/app/components/ui/forms/Input'
import PasswordInput from '@/app/components/ui/forms/PasswordInput'
import Checkbox from '@/app/components/ui/forms/Checkbox'
import { Field } from '@/app/components/ui/forms/Field'
import Alert from '@/app/components/ui/feedback/Alert'
import { ROUTES } from '@/app/routes/routes.constants'

/**
 * Admin Login — Vite conversion of the former Next.js Client Component.
 * Reuses loginSchema from the customer login (same email/password shape).
 * Admin/customer role differentiation still only happens server-side —
 * this file changes navigation/import plumbing only, not the auth boundary.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    const { error: signInError } = await signIn.email(values)

    if (signInError) {
      setServerError(signInError.message ?? 'Invalid email or password')
      return
    }

    navigate(ROUTES.ADMIN.DASHBOARD)
  }

  return (
    <>
      <Helmet>
        <title>Admin Login | SimpleStock V2</title>
        <meta
          name="description"
          content="Restricted access. Admin credentials required."
        />
      </Helmet>
      {/* Padding scaled per breakpoint (px-4/py-12 on phones up to px-6/py-16
          on tablet+) — the fixed py-16 previously pushed the form card below
          the fold on short mobile viewports (e.g. landscape phones). */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full max-w-sm flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-on-surface">Admin Login</h1>
            <p className="text-on-surface-variant text-body-sm">
              Restricted access. Admin credentials required.
            </p>
          </div>

          {serverError && (
            <Alert
              variant="tonal"
              color="error"
              title="Error"
              message={serverError}
            />
          )}

          <Field.Root required>
            <Field.Label>Email</Field.Label>
            <Input
              type="email"
              placeholder="Your email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-body-sm text-error">{errors.email.message}</p>
            )}
          </Field.Root>

          <Field.Root required>
            <Field.Label>Password</Field.Label>
            <PasswordInput
              placeholder="Your password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-body-sm text-error">
                {errors.password.message}
              </p>
            )}
          </Field.Root>

          <Controller
            name="rememberMe"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value ?? true}
                onChange={field.onChange}
                label="Remember me"
              />
            )}
          />

          <Button
            type="submit"
            variant="filled"
            color="primary"
            isLoading={isSubmitting}
            fullWidth
          >
            Log In
          </Button>
        </form>
      </div>
    </>
  )
}
