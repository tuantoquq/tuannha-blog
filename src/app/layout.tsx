import { ThemeProvider } from '@/app/providers'
import { WEBSITE_HOST_URL } from '@/lib/constants'
import type { Metadata } from 'next'
import Link from 'next/link'
import './global.css'
import Header from '@/layout/header'
import { Container } from '@/components/Container'
import Footer from '@/layout/footer'

const meta = {
  title: 'T Dev - Blog',
  description:
    'I like to blog about backend development, and I am open to new opportunities.',
  image: `${WEBSITE_HOST_URL}/tdev-logo.jpeg`,
}

export const metadata: Metadata = {
  title: {
    default: meta.title,
    template: '%s | T Dev',
  },
  description: meta.description,
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: WEBSITE_HOST_URL,
    siteName: meta.title,
    locale: 'en-US',
    type: 'website',
    images: [
      {
        url: meta.image,
      },
    ],
  },
  authors: [
    {
      name: 'Tuan Nguyen',
      url: 'https://github.com/tuantoquq',
    },
  ],
  alternates: {
    canonical: WEBSITE_HOST_URL,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <Header />
          <main>
            <Container>{children}</Container>
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
