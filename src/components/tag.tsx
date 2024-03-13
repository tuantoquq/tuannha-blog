type TagProps = {
  tag: string
}
export default function Tag({ tag }: TagProps) {
  return (
    <div className="rounded-lg bg-green-500 p-1 text-sm font-medium text-white ">
      <p>{tag}</p>
    </div>
  )
}
