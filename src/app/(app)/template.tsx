// A template remounts on every navigation, so each page's blocks rise in
// turn (`.page-enter` in globals.css; reduced motion turns it off).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
	return <div className="page-enter">{children}</div>
}
