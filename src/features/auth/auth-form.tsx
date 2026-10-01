'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SpinnerIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASSWORD_MIN_LENGTH } from '@/lib/constants'
import type { Credentials } from './use-auth-form'

type AuthFormProps = {
	mode: 'sign-in' | 'sign-up'
	pending: boolean
	error: string | null
	onSubmit: (values: Credentials) => void
}

export function AuthForm({ mode, pending, error, onSubmit }: AuthFormProps) {
	const id = useId()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const isSignUp = mode === 'sign-up'

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault()
				onSubmit({ email, password })
			}}
		>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${id}-email`}>Email</Label>
				<Input
					id={`${id}-email`}
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${id}-password`}>Password</Label>
				<Input
					id={`${id}-password`}
					type="password"
					autoComplete={isSignUp ? 'new-password' : 'current-password'}
					required
					minLength={PASSWORD_MIN_LENGTH}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				{isSignUp && (
					<p className="text-text-muted text-xs">At least {PASSWORD_MIN_LENGTH} characters.</p>
				)}
			</div>
			{error && (
				<p role="alert" className="text-danger text-sm">
					{error}
				</p>
			)}
			<Button type="submit" size="lg" disabled={pending}>
				{pending && <SpinnerIcon />}
				{isSignUp ? 'Create account' : 'Sign in'}
			</Button>
		</form>
	)
}
