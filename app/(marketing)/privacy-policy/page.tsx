// app/(marketing)/privacy-policy/page.tsx

import { PageSection } from '@/components/page-section';
import { Badge } from '@/components/ui/badge';

export default function PrivacyPolicyPage() {
  return (
    <PageSection>
      <div className='flex flex-col items-center space-y-8 px-4'>
        <Badge
                  variant="outline"
                  className="border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase"
                >
                  Privacy
                </Badge>
        <h1 className='text-3xl font-bold'>Privacy Policy</h1>
        <p className='text-muted-foreground'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec
          odio. Praesent libero. Sed cursus ante dapibus diam.
        </p>
        <div className='space-y-4 text-sm text-muted-foreground'>
          <p>
            Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum.
            Praesent mauris. Fusce nec tellus sed augue semper porta.
          </p>
          <p>
            Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent
            taciti sociosqu ad litora torquent per conubia nostra, per inceptos
            himenaeos.
          </p>
          <p>
            Curabitur sodales ligula in libero. Sed dignissim lacinia nunc.
            Curabitur tortor. Pellentesque nibh. Aenean quam.
          </p>
        </div>
      </div>
    </PageSection>
  )
}
