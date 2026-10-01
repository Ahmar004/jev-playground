'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { signIn, signUp } from '@/server/actions/auth'
import { AuthForm } from './auth-form'
import { useAuthForm } from './use-auth-form'

const TAB_CLASS =
	'text-text-muted data-[state=active]:bg-surface data-[state=active]:text-text flex-1 rounded px-3 py-2 text-sm font-semibold focus-visible:outline-accent focus-visible:outline focus-visible:outline-2'

export function SignInView() {
	const signInForm = useAuthForm(signIn)
	const signUpForm = useAuthForm(signUp)

	return (
		<Tabs.Root defaultValue="sign-in" className="flex flex-col gap-6">
			<Tabs.List
				aria-label="Sign in or create an account"
				className="bg-surface-hover flex gap-1 rounded p-1"
			>
				<Tabs.Trigger value="sign-in" className={TAB_CLASS}>
					Sign in
				</Tabs.Trigger>
				<Tabs.Trigger value="sign-up" className={TAB_CLASS}>
					Create account
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="sign-in">
				<AuthForm mode="sign-in" {...signInForm} onSubmit={signInForm.submit} />
			</Tabs.Content>
			<Tabs.Content value="sign-up">
				<AuthForm mode="sign-up" {...signUpForm} onSubmit={signUpForm.submit} />
			</Tabs.Content>
		</Tabs.Root>
	)
}
