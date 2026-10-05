'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { m } from 'motion/react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { placeCard } from './guide'
import type { GuideTarget } from './use-guide-target'

export type GuideAction = { label: string; onSelect: () => void }

const CARD_WIDTH = 360
// Dims everything but the spotlit element; the huge spread covers any screen.
// The dim layer (z-60) mounts again when a step gains or loses a target, which
// puts it after the card in the DOM, so the card sits a layer higher (z-70).
const DIM = '0 0 0 200vmax rgb(0 0 0 / 0.55)'

/**
 * One guide pop-up over the page: a spotlight on the target element and a
 * card beside it. It is a modal Radix Dialog, so focus stays in the card,
 * Esc dismisses, the page behind can't be clicked, and screen readers hear
 * the title and text. It only overlays the page and never changes its layout.
 */
export function GuideOverlay({
	target,
	counter,
	title,
	body,
	primary,
	secondary,
	onDismiss
}: {
	target: Extract<GuideTarget, { status: 'found' | 'missing' }>
	counter?: string
	title: string
	body: string
	primary: GuideAction
	secondary: GuideAction[]
	onDismiss: () => void
}) {
	const primaryRef = useRef<HTMLButtonElement>(null)
	const rect = target.status === 'found' ? target.rect : null
	const { spotlight, card, width } = placeCard(rect, target.viewport, CARD_WIDTH)
	const position: React.CSSProperties =
		'bottom' in card
			? { left: card.left, bottom: card.bottom }
			: card.top === 'center'
				? { left: card.left, top: '50%', translate: '0 -50%' }
				: { left: card.left, top: card.top }

	return (
		<Dialog.Root open onOpenChange={(open) => !open && onDismiss()}>
			<Dialog.Portal>
				{spotlight ? (
					<m.div
						aria-hidden
						className="ring-accent pointer-events-none fixed z-60 rounded-lg ring-2"
						style={{ boxShadow: DIM }}
						initial={false}
						animate={spotlight}
						transition={{ type: 'spring', stiffness: 420, damping: 38 }}
					/>
				) : (
					<div aria-hidden className="animate-fade-in fixed inset-0 z-60 bg-black/55" />
				)}
				<Dialog.Content
					onOpenAutoFocus={(event) => {
						event.preventDefault()
						primaryRef.current?.focus()
					}}
					onPointerDownOutside={(event) => event.preventDefault()}
					onInteractOutside={(event) => event.preventDefault()}
					style={{ ...position, width }}
					className="bg-surface border-border shadow-card-hover animate-pop-in fixed z-70 flex max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-y-auto rounded-lg border p-5"
				>
					{counter && (
						<p className="text-accent text-xs font-bold tracking-wide uppercase">{counter}</p>
					)}
					<Dialog.Title className="text-text text-lg font-bold">{title}</Dialog.Title>
					<Dialog.Description className="text-text-muted text-sm">{body}</Dialog.Description>
					<div className="flex flex-wrap items-center justify-end gap-2 pt-1">
						{secondary.map((action, index) => (
							<Button
								key={action.label}
								type="button"
								size="sm"
								variant={index === 0 ? 'ghost' : 'outline'}
								className={index === 0 ? 'mr-auto' : undefined}
								onClick={action.onSelect}
							>
								{action.label}
							</Button>
						))}
						<Button ref={primaryRef} type="button" size="sm" onClick={primary.onSelect}>
							{primary.label}
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
