// app/(marketing)/_components/auth/EmailAuthForm.tsx

'use client'
import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export function EmailAuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
  }

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type='email'
      />
      <Input
        placeholder='Password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type='password'
      />
      <Button className='w-full' onClick={handleLogin} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </div>
  )
}
