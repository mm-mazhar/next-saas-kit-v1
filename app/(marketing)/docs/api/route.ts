import { ApiReference } from '@scalar/nextjs-api-reference'

const config = {
  spec: {
    url: '/api/openapi.json',
  },
  theme: 'kepler' as const,
  metaData: {
    title: 'SaaS Kit API Documentation',
    description: 'Interactive API documentation for the Next.js SaaS Kit oRPC API',
  },
  hideModels: false,
  hideDownloadButton: false,
  darkMode: true,
}

export const GET = ApiReference(config)
