import { SideNav } from '@/app/components/SideNav'
import prisma from '@/app/lib/db'
import { stripe } from '@/app/lib/stripe'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

async function getData({
  email,
  id,
  firstName,
  lastName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  profileImage,
}: {
  email: string
  id: string
  firstName: string | undefined | null
  lastName: string | undefined | null
  profileImage: string | undefined | null
}) {
  noStore()
  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  })

  if (!user) {
    const name = `${firstName ?? ''} ${lastName ?? ''}`
    await prisma.user.create({
      data: {
        id: id,
        email: email,
        name: name,
      },
    })
  }

  if (!user?.stripeCustomerId) {
    const data = await stripe.customers.create({
      email: email,
    })

    await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        stripeCustomerId: data.id,
      },
    })
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { getUser } = getKindeServerSession()
  const user = await getUser()
  if (!user) {
    return redirect('/')
  }
  await getData({
    email: user.email as string,
    firstName: user.given_name as string,
    id: user.id as string,
    lastName: user.family_name as string,
    profileImage: user.picture,
  })

  return (
    <div className='flex min-h-screen w-full flex-col'>
      <div className='flex flex-1'>
        <SideNav />
        <main className='p-8 w-full'>{children}</main>
      </div>
    </div>
  )
}
