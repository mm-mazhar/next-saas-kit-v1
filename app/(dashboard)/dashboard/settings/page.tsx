// app/(dashboard)/dashboard/settings/page.tsx

import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { SettingsSubmitButton } from '@/app/(dashboard)/_components/Submitbuttons'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/app/(dashboard)/_components/ui/select'
import { unstable_noStore as noStore, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getData(userId: string) {
  noStore()
  const data = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      email: true,
      colorScheme: true,
    },
  })

  return data
}

export default async function SettingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const data = await getData(user.id)

  async function postData(formData: FormData) {
    'use server'

    const name = formData.get('name') as string
    const colorScheme = formData.get('color') as string

    try {
      await prisma.user.update({
        where: { id: user?.id },
        data: { name: name ?? undefined, colorScheme: colorScheme ?? undefined },
      })
    } catch {
      await new Promise((r) => setTimeout(r, 300))
      await prisma.user.update({
        where: { id: user?.id },
        data: { name: name ?? undefined, colorScheme: colorScheme ?? undefined },
      })
    }

    revalidatePath('/', 'layout')
  }

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
      <div className='flex items-center justify-between'>
        <div className='grid gap-1'>
          <h1 className='text-3xl md:text-4xl'>Settings</h1>
          <p className='text-lg text-muted-foreground'>Your Profile settings</p>
        </div>
      </div>

      <Card>
        <form action={postData}>
          <CardHeader>
            <CardTitle>General Data</CardTitle>
            <CardDescription>
              Please provide general information about yourself. Please dont
              forget to save
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-3'>
            <div className='space-y-4'>
              <div className='space-y-1'>
                <Label>Your Name</Label>
                <Input
                  name='name'
                  type='text'
                  id='name'
                  placeholder='Your Name'
                  defaultValue={data?.name ?? undefined}
                />
              </div>
              <div className='space-y-1'>
                <Label>Your Email</Label>
                <Input
                  name='email'
                  type='email'
                  id='email'
                  placeholder='Your Email'
                  disabled
                  defaultValue={data?.email as string}
                />
              </div>

              <div className='space-y-1'>
                <Label>Color Scheme</Label>
                <Select name='color' defaultValue={data?.colorScheme}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select a color' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Color</SelectLabel>
                      <SelectItem value='theme-neutral'>Neutral</SelectItem>
                      <SelectItem value='theme-green'>Green</SelectItem>
                      <SelectItem value='theme-blue'>Blue</SelectItem>
                      <SelectItem value='theme-violet'>Violet</SelectItem>
                      <SelectItem value='theme-yellow'>Yellow</SelectItem>
                      <SelectItem value='theme-orange'>Orange</SelectItem>
                      <SelectItem value='theme-red'>Red</SelectItem>
                      <SelectItem value='theme-rose'>Rose</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {/* Theme Mode removed; use global toggles to change theme instantly */}
            </div>
          </CardContent>

          <CardFooter className='pt-3'>
            <SettingsSubmitButton />
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
