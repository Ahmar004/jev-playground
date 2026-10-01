'use client'

import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { ThemeProvider } from 'next-themes'

// Theme follows the device until the user picks one; the choice is remembered
// locally (spec R71, allowed under Rule-8: a theme is not a secret). Motion
// loads its animation features lazily and honors reduced motion (R91).
export function AppProviders({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<LazyMotion features={domAnimation} strict>
				<MotionConfig reducedMotion="user">{children}</MotionConfig>
			</LazyMotion>
		</ThemeProvider>
	)
}
