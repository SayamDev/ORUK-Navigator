import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <strong>ORUK Navigator</strong>
          <p>An independent open-source service discovery project.</p>
        </div>
        <div>
          <Link href="/about">About the data</Link>
          <a href="https://github.com/SayamDev/ORUK-Navigator">View on GitHub</a>
        </div>
      </div>
    </footer>
  );
}
