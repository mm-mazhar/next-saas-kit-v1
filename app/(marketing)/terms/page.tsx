// app/(marketing)/terms/page.tsx

'use client'

import { PageSection } from '@/components/page-section';
import { Badge } from '@/components/ui/badge';

export default function TermsPage() {
  return (
    <PageSection>
      <div className='flex flex-col items-center space-y-8 px-4'>
        <Badge
                  variant="outline"
                  className="border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase"
                >
                  Terms
                </Badge>
        <h1 className='text-3xl font-bold'>Terms and Conditions</h1>
        <p className='text-muted-foreground'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam
          pharetra, erat sed fermentum feugiat, velit mauris egestas quam, ut
          aliquam massa nisl quis neque.
        </p>
        <div className='space-y-4 text-sm text-muted-foreground'>
          <p>
            Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
            posuere cubilia curae; Morbi lacinia molestie dui.
          </p>
          <p>
            Praesent blandit dolor. Sed non quam. In vel mi sit amet augue
            congue elementum.
          </p>
          <p>
            Morbi in ipsum sit amet pede facilisis laoreet. Donec lacus nunc,
            viverra nec, blandit vel, egestas et, augue.
          </p>
        </div>
      </div>
    </PageSection>
  )
}
