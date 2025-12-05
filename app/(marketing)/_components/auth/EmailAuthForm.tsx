// app/(marketing)/_components/auth/EmailAuthForm.tsx

'use client'
import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export function EmailAuthForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/dashboard'

  const handleMagicLink = async () => {
    setLoading(true)
    setErrorMsg(null)
    setInfoMsg(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
    } else {
      setInfoMsg('Check your inbox for the magic link')
    }
    setLoading(false)
  }

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type='email'
        className='focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
      />
      <Button
        className='w-full'
        onClick={handleMagicLink}
        disabled={loading || !email}
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </Button>
      {errorMsg && (
        <p className='text-sm text-destructive text-center mt-2'>{errorMsg}</p>
      )}
      {infoMsg && (
        <p className='text-sm text-muted-foreground text-center mt-2'>{infoMsg}</p>
      )}
    </div>
  )
}
