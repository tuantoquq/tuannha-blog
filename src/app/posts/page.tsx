import { PostCard } from '@/components/post-card'
import { allPosts } from 'contentlayer/generated'
import { compareDesc } from 'date-fns'

export default function PostPage() {
  const posts = allPosts.sort((a, b) =>
    compareDesc(new Date(a.date), new Date(b.date)),
  )
  return (
    <div className="mt-10 space-y-12 border-t border-gray-200 pt-10 dark:border-gray-700">
      {posts.map((post, idx) => (
        <PostCard key={idx} {...post} />
      ))}
    </div>
  )
}
