import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { SharedResult } from '@/features/arena/shared-result'
import { ROUTES } from '@/lib/links'
import { getShare } from '@/server/data/shares'

// Read-only and not indexed (R87); the X-Robots-Tag header in next.config.ts says the same.
export const metadata: Metadata = {
	title: "Shared result - Jev's Playground",
	description: "A result shared from Jev's Playground. Sign in to try it yourself.",
	robots: { index: false, follow: false }
}

// The one page reachable without signing in (spec 5.1), so it has no header or session.
async function Shared({ params }: { params: PageProps<'/s/[shareId]'>['params'] }) {
	// Read per request, never from a prerendered shell or a cache: a deleted share must stop working at once (R87).
	await connection()
	const { shareId } = await params
	const snapshot = await getShare(shareId)
	if (!snapshot) notFound()
	return <SharedResult snapshot={snapshot} />
}

export default function SharedPage({ params }: PageProps<'/s/[shareId]'>) {
	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
			<Suspense
				fallback={
					<div role="status" aria-busy="true" className="skeleton h-64 rounded-lg">
						<span className="sr-only">Loading the shared result</span>
					</div>
				}
			>
				<Shared params={params} />
			</Suspense>
			<div>
				<Button asChild>
					<Link href={ROUTES.signIn}>Sign in to try it yourself</Link>
				</Button>
			</div>
		</main>
	)
}
