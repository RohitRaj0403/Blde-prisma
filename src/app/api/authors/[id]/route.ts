import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const author = await prisma.author.findUnique({
      where: { id: params.id },
      include: {
        primaryDept: true,
        authorships: {
          include: {
            publication: {
              include: {
                journal: true,
              },
            },
          },
          orderBy: {
            publication: {
              year: 'desc',
            },
          },
        },
      },
    })

    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 })
    }

    return NextResponse.json(author)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const user = session.user as any

  try {
    const author = await prisma.author.findUnique({
      where: { id: params.id },
    })

    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 })
    }

    // Check permissions: Admin, Verifier, or the author themselves
    const isOwner = author.userId === user.id
    const isAuthorized = ['ADMIN', 'VERIFIER'].includes(user.role) || isOwner

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { fullName, orcid, scopusAuthorId, googleScholarId, vidwanId, researcherId, designation, school, bio, education, experience, expertise, photoUrl } = body

    const updatedAuthor = await prisma.author.update({
      where: { id: params.id },
      data: {
        fullName: fullName?.trim() || author.fullName,
        orcid: orcid?.trim() || null,
        scopusAuthorId: scopusAuthorId?.trim() || null,
        googleScholarId: googleScholarId?.trim() || null,
        vidwanId: vidwanId?.trim() || null,
        researcherId: researcherId?.trim() || null,
        designation: designation?.trim() || null,
        school: school?.trim() || null,
        bio: bio?.trim() || null,
        education: education?.trim() || null,
        experience: experience?.trim() || null,
        expertise: Array.isArray(expertise) ? expertise : [],
        photoUrl: photoUrl?.trim() || null,
      },
    })

    return NextResponse.json(updatedAuthor)
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'ORCID, Scopus, Vidwan or ResearcherID already exists on another profile.' }, { status: 409 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
