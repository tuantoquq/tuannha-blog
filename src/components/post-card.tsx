import { Post } from 'contentlayer/generated'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import Tag from './tag'

export function PostCard(post: Post) {
  const tags = post.tags
  return (
    <article className="flex flex-col items-start justify-between">
      <div className="flex items-center gap-x-4 text-xs">
        <time dateTime={post.date}>
          {format(parseISO(post.date), 'LLLL d, yyyy')}
        </time>
      </div>
      <div className="group relative">
        <h3 className="mt-3 text-lg font-semibold leading-6">
          <Link className="link" href={post.url}>
            <span className="absolute inset-0" />
            {post.title}
          </Link>
        </h3>
        {tags && tags.length > 0 && (
          <div className="mt-5 flex flex-row gap-2">
            {tags.map((tag, idx) => (
              <Tag key={idx} tag={tag} />
            ))}
          </div>
        )}
        <p className="mt-5 line-clamp-3 text-sm leading-6">
          {post.description}
        </p>
      </div>
    </article>
  )
}
