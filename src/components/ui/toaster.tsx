'use client'

import { useToast } from '@/lib/toast'
import {
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport
} from '@/components/ui/toast'

// Mounted once in the root layout. Call toast() from src/lib/toast.ts
// anywhere in the app to show one — nothing else to wire up per call site.
export function Toaster() {
	const { toasts, dismiss } = useToast()

	return (
		<ToastProvider>
			{toasts.map(({ id, title, description, variant, action, persistent }) => (
				<Toast
					key={id}
					variant={variant}
					// Radix closes a toast on its own timer too; a persistent one waits for the user.
					duration={persistent ? Infinity : undefined}
					onOpenChange={(open) => !open && dismiss(id)}
				>
					<div className="grid gap-1">
						{title && <ToastTitle>{title}</ToastTitle>}
						{description && <ToastDescription>{description}</ToastDescription>}
					</div>
					{action && (
						<ToastAction altText={action.label} onClick={action.onClick}>
							{action.label}
						</ToastAction>
					)}
					<ToastClose />
				</Toast>
			))}
			<ToastViewport />
		</ToastProvider>
	)
}
