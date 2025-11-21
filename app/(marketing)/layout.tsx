// app/(marketing)/layout.tsx

import FooterSection from '@/app/(marketing)/_components/footer'
import { HeroHeader } from '@/app/(marketing)/_components/header'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-screen flex-col'>
      <HeroHeader />
      <main className='flex-1'>{children}</main>
      <FooterSection />
    </div>
  )
}
