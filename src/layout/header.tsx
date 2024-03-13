import { Container } from '@/components/Container'
import { Navigation } from '@/components/navigation'
import Profile from '@/components/profile'
import ThemeSwitch from '@/components/theme-switch'

export default function Header() {
  return (
    <header className="py-4">
      <Container>
        <div className="flex items-center justify-between py-6">
          <div className="flex w-[80%] items-center justify-between">
            <Profile />
            <Navigation />
          </div>
          <div className="w-[5%]">
            <ThemeSwitch />
          </div>
        </div>
      </Container>
    </header>
  )
}
