import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/">ORUK Navigator</Link>
        <nav aria-label="Primary navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/about#data-sources">Data sources</Link>
          <Link href="/about#about-this-pilot">About this pilot</Link>
        </nav>
      </div>
    </header>
  );
}
