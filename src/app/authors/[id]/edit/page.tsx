import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import EditProfileClient from './EditProfileClient'

export default async function EditAuthorPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const user = session.user as any

  const author = await prisma.author.findUnique({
    where: { id: params.id },
  })

  if (!author) {
    notFound()
  }

  // Permission check: Admin, Verifier, or the owner
  const isOwner = author.userId === user.id
  const isAuthorized = ['ADMIN', 'VERIFIER'].includes(user.role) || isOwner

  if (!isAuthorized) {
    redirect(`/authors/${author.id}`)
  }

  // Prepare author data for form (handle nulls safely)
  const authorData = {
    id: author.id,
    fullName: author.fullName,
    orcid: author.orcid ?? '',
    scopusAuthorId: author.scopusAuthorId ?? '',
    googleScholarId: author.googleScholarId ?? '',
    vidwanId: author.vidwanId ?? '',
    researcherId: author.researcherId ?? '',
    designation: author.designation ?? '',
    school: author.school ?? '',
    bio: author.bio ?? '',
    education: author.education ?? '',
    experience: author.experience ?? '',
    expertise: author.expertise ?? [],
    photoUrl: author.photoUrl ?? '',
  }

  return <EditProfileClient author={authorData} />
}
