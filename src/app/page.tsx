import { PostCard } from '@/components/post-card'
import { Button } from '@/components/ui/button'
import { allPosts } from 'contentlayer/generated'
import { compareDesc } from 'date-fns'
import { Github } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const posts = allPosts.sort((a, b) =>
    compareDesc(new Date(a.date), new Date(b.date)),
  )

  return (
    <div>
      <div className="space-y-7">
        <p>
          Hello everyone, I&apos;m Tuan. I&apos;m a software engineer and I love
          to write about everything that I know. I hope my blog will bring
          useful knowledge to you. Thanks for visiting.
        </p>
        <p>
          This&apos;s main current stack of my blog. I hope you will find it
        </p>
        <ul className="my-6 list-disc space-y-2 pl-4">
          <li>
            <Link className="link" href="#">
              Backend Development
            </Link>
          </li>
          <li>
            <Link className="link" href="#">
              Devops & Cloud
            </Link>
          </li>
          <li>
            <Link className="link" href="#">
              Frontend Development
            </Link>
          </li>
          <li>
            <Link className="link" href="#">
              Mobile Development
            </Link>
          </li>
        </ul>

        <Button asChild>
          <a href="https://github.com/tuantoquq">
            <Github className="mr-1" /> Visit my profile!
          </a>
        </Button>
      </div>

      <div className="mt-10 space-y-12 border-t border-gray-200 pt-10 dark:border-gray-700">
        {posts.map((post, idx) => (
          <PostCard key={idx} {...post} />
        ))}
      </div>
    </div>
  )
}
