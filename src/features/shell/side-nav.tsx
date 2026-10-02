'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, CloseIcon, SidebarIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { isActive, SIDEBAR_NAV } from './nav-items'

const STAGGER_MS = 30

/**
 * The sidebar: every page in one list, one tap from the header on any
 * screen (DESIGN 6). `progress` is the server-rendered path progress, shown
 * here because the header hides it on phones.
 */
export function SideNav({ progress }: { progress: React.ReactNode }) {
	const pathname = usePathname()
	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<Button type="button" variant="ghost" size="sm" aria-label="Open menu">
					<SidebarIcon size={20} />
				</Button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
				<Dialog.Content className="bg-surface border-border shadow-card-hover data-[state=closed]:animate-slide-out-left data-[state=open]:animate-slide-in-left fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-4 overflow-y-auto border-r p-4">
					<div className="flex items-center justify-between gap-3">
						<Dialog.Title className="text-brand text-xl font-extrabold">
							Jev&apos;s Playground
						</Dialog.Title>
						<Dialog.Close
							aria-label="Close menu"
							className="text-text hover:bg-surface-hover focus-visible:outline-accent rounded-full p-1.5 transition-colors focus-visible:outline focus-visible:outline-2"
						>
							<CloseIcon size={18} />
						</Dialog.Close>
					</div>
					<Dialog.Description className="sr-only">Every page of the playground</Dialog.Description>
					<div className="sm:hidden">{progress}</div>
					<nav aria-label="All pages">
						<ul className="flex flex-col gap-1">
							{SIDEBAR_NAV.map(({ href, label, Icon, hue }, index) => {
								const active = isActive(pathname, href)
								return (
									<li
										key={href}
										className="animate-rise"
										// The stagger step is data, not a design value.
										style={{ animationDelay: `${index * STAGGER_MS}ms` }}
									>
										<Dialog.Close asChild>
											<Link
												href={href}
												aria-current={active ? 'page' : undefined}
												className={cn(
													'group focus-visible:outline-accent flex items-center gap-3 rounded-lg p-2 text-base font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2',
													active
														? 'bg-accent/12 text-accent'
														: 'text-text hover:bg-surface-hover hover:translate-x-1'
												)}
											>
												<span
													className={cn(
														'flex size-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110',
														hue
													)}
												>
													<Icon size={20} />
												</span>
												<span className="flex-1">{label}</span>
												<ChevronRightIcon
													size={14}
													className="text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
												/>
											</Link>
										</Dialog.Close>
									</li>
								)
							})}
						</ul>
					</nav>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
