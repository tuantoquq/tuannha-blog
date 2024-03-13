import Image from 'next/image'
import avatar from 'public/images/avt.jpg'
export default function Profile() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div>
        <Image
          src={avatar}
          alt="profile"
          className="h-20 w-20 rounded-full"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <h3>@tuannha</h3>
    </div>
  )
}
