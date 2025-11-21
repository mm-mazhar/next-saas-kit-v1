// app/(marketing)/about/page.tsx

import { PageSection } from '@/components/page-section'

export default function AboutPage() {
  return (
    <PageSection className='py-16'>
      {/* The "max-w-3xl" and "mx-auto" classes have been removed from this div */}
      <div className='space-y-8 px-4'>
        <h1 className='text-3xl font-bold'>About</h1>
        <p className='text-muted-foreground'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. We build
          tools to launch SaaS apps faster.
        </p>
        <div className='space-y-4 text-sm text-muted-foreground'>
          <p>
            Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
            Sed nisi. Nulla quis sem at nibh elementum imperdiet.
          </p>
          <p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p>
          <p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p>
          <p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p>
          <p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p>
          <p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p>
          <p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p><p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p>
          <p>
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta.
          </p>
        </div>
      </div>
    </PageSection>
  )
}
