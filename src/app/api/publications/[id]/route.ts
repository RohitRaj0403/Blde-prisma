import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const pub = await prisma.publication.findUnique({
    where: { id: params.id },
    include: {
      journal: { include: { publisher: true } },
      authorships: { include: { author: true, department: true, affiliation: true }, orderBy: { authorOrder: 'asc' } },
      indexing: true,
      keywords: { include: { keyword: true } },
      citations: { orderBy: { capturedOn: 'desc' } },
      verifications: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
      auditLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!pub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(pub)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const user = session.user as any
  if (!['ADMIN', 'VERIFIER'].includes(user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()

  const existing = await prisma.publication.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.publication.update({
    where: { id: params.id },
    data: {
      title: body.title ?? existing.title,
      year: body.year ?? existing.year,
      doi: body.doi !== undefined ? (body.doi || null) : existing.doi,
      abstract: body.abstract !== undefined ? (body.abstract || null) : existing.abstract,
      volume: body.volume !== undefined ? body.volume : existing.volume,
      issue: body.issue !== undefined ? body.issue : existing.issue,
      pages: body.pages !== undefined ? body.pages : existing.pages,
      url: body.url !== undefined ? body.url : existing.url,
      publicationType: body.publicationType ?? existing.publicationType,
    },
  })

  // Update indexing if provided
  if (body.indexing) {
    await prisma.publicationIndexing.upsert({
      where: { publicationId: params.id },
      update: body.indexing,
      create: { publicationId: params.id, ...body.indexing },
    })
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      publicationId: params.id,
      userId: user.id,
      action: 'UPDATE',
      oldValue: { title: existing.title, year: existing.year },
      newValue: { title: updated.title, year: updated.year },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can delete publications' }, { status: 403 })
  }

  await prisma.publication.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
