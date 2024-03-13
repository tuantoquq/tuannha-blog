import Link from 'next/link'

export function Navigation() {
  return (
    <nav>
      <Link href="/" className="nav-link">
        Home
      </Link>
      <Link href="/posts" className="nav-link">
        Post
      </Link>
      <Link href="/tags" className="nav-link">
        Tags
      </Link>
      <Link href="/about" className="nav-link">
        About
      </Link>
    </nav>
  )
}
