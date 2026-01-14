import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod'
import { appRouter } from '@/lib/orpc/root'

/**
 * OpenAPI specification generator for the oRPC API
 * Generates a JSON schema from the app router
 */
const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
})

/**
 * Generate OpenAPI spec from the app router
 */
async function generateOpenAPISpec() {
  return await generator.generate(appRouter, {
    info: {
      title: 'SaaS Kit API',
      version: '1.0.0',
      description: 'Type-safe API for the Next.js SaaS Kit',
    },
    servers: [
      {
        url: '/api/rpc',
        description: 'RPC endpoint',
      },
    ],
  })
}

export async function GET() {
  const spec = await generateOpenAPISpec()
  
  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
