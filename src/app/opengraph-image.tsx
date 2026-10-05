import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/site'

export const alt = `${SITE_NAME}: see where a fast System One model works and where it breaks`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// An image has no CSS variables, so these are the light-theme values of the
// tokens in globals.css (--bg, --surface, --text, --text-muted, --jev,
// --highlight, --llm, --code). Keep them in step when a token changes.
const COLORS = {
	bg: '#f3e5c8',
	surface: '#fffbf3',
	text: '#1f2328',
	textMuted: '#56503f',
	jev: '#0a706b',
	highlight: '#f2a33a',
	llm: '#7a3fd1',
	code: '#46566a'
}

const RACERS = [
	{ label: 'Jev', color: COLORS.jev },
	{ label: 'LLM', color: COLORS.llm },
	{ label: 'Code', color: COLORS.code }
]

export default function OpengraphImage() {
	return new ImageResponse(
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				padding: '0 88px',
				background: COLORS.bg,
				color: COLORS.text
			}}
		>
			<div
				style={{
					display: 'flex',
					width: 160,
					height: 12,
					borderRadius: 6,
					marginBottom: 40,
					background: `linear-gradient(100deg, ${COLORS.jev}, ${COLORS.highlight}, ${COLORS.llm})`
				}}
			/>
			<div style={{ display: 'flex', fontSize: 104, fontWeight: 800, lineHeight: 1.05 }}>
				{SITE_NAME}
			</div>
			<div
				style={{
					display: 'flex',
					marginTop: 28,
					maxWidth: 940,
					fontSize: 42,
					lineHeight: 1.3,
					color: COLORS.textMuted
				}}
			>
				Race Jev against an LLM and plain code. Learn where fast System One models shine and where
				they break.
			</div>
			<div style={{ display: 'flex', marginTop: 48, gap: 20 }}>
				{RACERS.map((racer) => (
					<div
						key={racer.label}
						style={{
							display: 'flex',
							padding: '12px 32px',
							borderRadius: 999,
							fontSize: 34,
							fontWeight: 700,
							background: COLORS.surface,
							color: racer.color,
							border: `4px solid ${racer.color}`
						}}
					>
						{racer.label}
					</div>
				))}
			</div>
		</div>,
		{ ...size }
	)
}
