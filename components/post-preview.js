import Avatar from '../components/avatar'
import DateFormatter from '../components/date-formatter'
import Link from 'next/link'

export default function PostPreview({title, date, excerpt, author, slug}) {
  return (
    <div className="my-40">
      <h3 className="mb-3 text-3xl font-bold leading-snug">
        <Link as={`/posts/${slug}`} href="/posts/[slug]" className="hover:underline">
          {title}
        </Link>
      </h3>
      <div className="mb-4 text-lg">
        <DateFormatter dateString={date} />
      </div>
      <p className="mb-4 text-lg leading-relaxed">{excerpt}</p>
      {/* <Avatar name={author.name} picture={author.picture} /> */}
    </div>
  );
}
