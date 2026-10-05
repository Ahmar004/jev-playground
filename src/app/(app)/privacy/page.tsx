import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@/lib/links'

export const metadata: Metadata = { title: "Privacy - Jev's Playground" }

// What we store and never store (spec 13), in plain words. Keep each line true to
// the code: a claim here that the app does not keep is worse than a missing one.
const STORED = [
	'Your email and sign-in, held by Supabase.',
	'Your level progress, check answers, quiz answers, XP and badges.',
	'Your leaderboard entries: scores, model IDs and the mode, never the text you typed.',
	'A result you choose to share, as a read-only snapshot. You can delete it any time and its link stops working at once.',
	'Short-lived request counters that limit abuse. They hold a one-way hash of your user ID, email or IP address, never the value itself, and are cleared after about a day.',
	'In your browser only: your theme choice and your sign-in session cookie.'
]
const NEVER = [
	'Your API keys. They live in this tab only and disappear when you close or reload it. They are never written to a database, log, analytics event, cookie or browser storage.',
	'The text of your questions or tricks, or what a model answered, in analytics or logs.',
	'The body of a request sent to Jev through our server. The server passes it on and keeps neither it nor your key.',
	'Personal data beyond your email: no name, phone number or payment details.'
]
const SERVICES = [
	'Supabase holds your account and the data above.',
	'Sentry receives error reports with keys and auth headers removed.',
	'PostHog receives anonymous usage events (a random id for your browser, event names and numbers, no email, no account and no text you typed). Session replay masks everything you type.',
	'Anthropic, OpenAI, Google and OpenRouter receive your prompts straight from your browser, with your own key, when you run something in Developer mode. TypeSafe receives Jev requests through our server. Their own privacy terms apply to what they receive.'
]

function Section({ title, items }: { title: string; items: string[] }) {
	return (
		<section className="bg-surface border-border shadow-card flex flex-col gap-2 rounded-lg border p-4">
			<h2 className="text-text text-xl font-bold">{title}</h2>
			<ul className="text-text-muted list-disc space-y-1 pl-5">
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</section>
	)
}

export default function PrivacyPage() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
			<div className="flex flex-col gap-2">
				<h1 className="text-text text-3xl font-extrabold">Privacy</h1>
				<p className="text-text-muted">
					What Jev&apos;s Playground keeps about you, and what it never keeps.
				</p>
			</div>
			<Section title="What we store" items={STORED} />
			<Section title="What we never store" items={NEVER} />
			<Section title="Who else sees what" items={SERVICES} />
			<section className="bg-surface border-border shadow-card flex flex-col gap-2 rounded-lg border p-4">
				<h2 className="text-text text-xl font-bold">Deleting your data</h2>
				<p className="text-text-muted">
					You can delete your account on your{' '}
					<Link href={ROUTES.profile} className="text-accent underline">
						profile
					</Link>
					. It removes your sign-in, progress, answers, XP, badges, leaderboard entries and shared
					results. Anonymous analytics events cannot be tied back to you, so they stay.
				</p>
			</section>
		</main>
	)
}
