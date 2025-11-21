// app/(marketing)/_components/footer.tsx

import SiteLogo from '@/app/(marketing)/_components/Sitelogo'
import { PageSection } from '@/components/page-section'
import { NEXT_PUBLIC_SITE_NAME, SOCIAL_LINKS } from '@/lib/constants'
import Link from 'next/link'

const links = [
  {
    title: 'Privacy Policy',
    href: '/privacy-policy',
  },
  {
    title: 'Terms and Conditions',
    href: '/terms',
  },
  {
    title: 'Contact Us',
    href: '/contact',
  },
  {
    title: 'About',
    href: '/about',
  },
]

import {
  SiFacebook,
  SiInstagram,
  SiLinkedin,
  SiTiktok,
  SiX,
  SiYoutube,
} from 'react-icons/si'

export default function FooterSection() {
  return (
    <PageSection as='footer' className='pb-8 md:pb-12'>
      <div className='flex flex-col items-center text-center'>
        <SiteLogo />

        {/* This div for page links remains the same */}
        <div className='my-8 flex flex-wrap justify-center gap-6 text-sm'>
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className='text-muted-foreground hover:text-primary block duration-150'
            >
              <span>{link.title}</span>
            </Link>
          ))}
        </div>

        {/* ✅ THE FIX: Changed `my-8` to `mb-8` on this div. */}
        {/* This removes the top margin, closing the gap from above. */}
        <div className='mb-8 flex flex-wrap justify-center gap-6 text-sm'>
          <Link
            href={SOCIAL_LINKS.twitter}
            className='block hover:text-primary transition-colors'
          >
            <SiX size={24} />
          </Link>
          <Link
            href={SOCIAL_LINKS.linkedin}
            className='block hover:text-primary transition-colors'
          >
            <SiLinkedin size={24} />
          </Link>
          <Link
            href={SOCIAL_LINKS.facebook}
            className='block hover:text-primary transition-colors'
          >
            <SiFacebook size={24} />
          </Link>
          <Link
            href={SOCIAL_LINKS.youtube}
            className='block hover:text-primary transition-colors'
          >
            <SiYoutube size={24} />
          </Link>
          <Link
            href={SOCIAL_LINKS.instagram}
            className='block hover:text-primary transition-colors'
          >
            <SiInstagram size={24} />
          </Link>
          <Link
            href={SOCIAL_LINKS.tiktok}
            className='block hover:text-primary transition-colors'
          >
            <SiTiktok size={24} />
          </Link>
        </div>

        <span className='text-muted-foreground block text-center text-sm'>
          © {new Date().getFullYear()} {NEXT_PUBLIC_SITE_NAME}, All rights
          reserved
        </span>
      </div>
    </PageSection>
  )
}
