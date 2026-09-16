import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="ORUK Navigator home">
          <span className="wordmark-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>ORUK <strong>Navigator</strong></span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/">Find support</Link>
          <Link href="/about">About the data</Link>
        </nav>
      </div>
    </header>
  );
}
