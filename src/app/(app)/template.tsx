// A template remounts on every navigation, so each page's blocks rise in
// turn (`.page-enter` in globals.css; reduced motion turns it off). It fills
// the shell's height so a page can grow to meet the footer.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
	return <div className="page-enter flex flex-1 flex-col">{children}</div>
}
