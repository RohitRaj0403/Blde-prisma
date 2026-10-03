import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSchema = z.object({
  title: z.string().min(5),
  year: z.number().int().min(1900).max(2100),
  publicationType: z.string().optional(),
  doi: z.string().optional().nullable(),
  pmid: z.string().optional().nullable(),
  abstract: z.string().optional().nullable(),
  journalTitle: z.string().optional().nullable(),
  journalIssn: z.string().optional().nullable(),
  volume: z.string().optional().nullable(),
  issue: z.string().optional().nullable(),
  pages: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  indexedScopus: z.boolean().optional(),
  indexedWos: z.boolean().optional(),
  indexedPubmed: z.boolean().optional(),
  indexedDoaj: z.boolean().optional(),
  indexedUgcCare: z.boolean().optional(),
  keywords: z.array(z.string()).optional(),
  authors: z.array(z.object({
    fullName: z.string(),
    authorOrder: z.number(),
    isCorresponding: z.boolean().optional(),
    departmentId: z.string().optional().nullable(),
    internalAuthor: z.boolean().optional(),
  })).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const take = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * take
  const q = searchParams.get('q') ?? ''
  const year = searchParams.get('year')
  const status = searchParams.get('status')
  const dept = searchParams.get('dept')

  const where: any = {}
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { doi: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (year) where.year = parseInt(year)
  if (status) where.verificationStatus = status
  if (dept) where.authorships = { some: { departmentId: dept } }

  const [publications, total] = await Promise.all([
    prisma.publication.findMany({
      where, take, skip,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      include: {
        journal: { select: { title: true, issn: true } },
        indexing: true,
        authorships: { include: { author: { select: { fullName: true } } }, orderBy: { authorOrder: 'asc' }, take: 5 },
        citations: { orderBy: { capturedOn: 'desc' }, take: 1 },
      },
    }),
    prisma.publication.count({ where }),
  ])

  return NextResponse.json({ publications, total, page, totalPages: Math.ceil(total / take) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const user = session.user as any
  if (!['ADMIN', 'VERIFIER', 'FACULTY'].includes(user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data

  // Upsert journal
  let journalId: string | null = null
  if (data.journalTitle) {
    const journal = await prisma.journal.upsert({
      where: { id: '__noop__' },
      update: {},
      create: { title: data.journalTitle, issn: data.journalIssn ?? undefined },
    }).catch(async () => {
      return prisma.journal.findFirst({ where: { title: { equals: data.journalTitle!, mode: 'insensitive' } } })
    })
    journalId = journal?.id ?? null
  }

  // Check for duplicate DOI
  if (data.doi) {
    const exists = await prisma.publication.findUnique({ where: { doi: data.doi } })
    if (exists) return NextResponse.json({ error: 'A publication with this DOI already exists', existingId: exists.id }, { status: 409 })
  }

  const pub = await prisma.publication.create({
    data: {
      title: data.title,
      year: data.year,
      publicationType: (data.publicationType ?? 'ARTICLE') as any,
      doi: data.doi || null,
      pmid: data.pmid || null,
      abstract: data.abstract || null,
      volume: data.volume || null,
      issue: data.issue || null,
      pages: data.pages || null,
      url: data.url || null,
      source: 'MANUAL',
      verificationStatus: user.role === 'FACULTY' ? 'PENDING' : 'IMPORTED',
      journalId,
      indexing: {
        create: {
          indexedScopus: data.indexedScopus ?? false,
          indexedWos: data.indexedWos ?? false,
          indexedPubmed: data.indexedPubmed ?? false,
          indexedDoaj: data.indexedDoaj ?? false,
          indexedUgcCare: data.indexedUgcCare ?? false,
        },
      },
    },
  })

  // Create authors
  if (data.authors && data.authors.length > 0) {
    for (const a of data.authors) {
      const author = await prisma.author.upsert({
        where: { id: '__noop__' },
        update: {},
        create: { fullName: a.fullName, nameVariants: [a.fullName], primaryDeptId: a.departmentId ?? null },
      }).catch(async () => {
        return prisma.author.findFirst({ where: { fullName: { equals: a.fullName, mode: 'insensitive' } } })
      })

      if (author) {
        await prisma.authorship.create({
          data: {
            publicationId: pub.id,
            authorId: author.id,
            authorOrder: a.authorOrder,
            isCorresponding: a.isCorresponding ?? false,
            departmentId: a.departmentId ?? null,
            internalAuthor: a.internalAuthor ?? false,
          },
        })
      }
    }
  }

  // Keywords
  if (data.keywords && data.keywords.length > 0) {
    for (const kw of data.keywords) {
      const keyword = await prisma.keyword.upsert({
        where: { keywordText: kw },
        update: {},
        create: { keywordText: kw },
      })
      await prisma.publicationKeyword.upsert({
        where: { publicationId_keywordId: { publicationId: pub.id, keywordId: keyword.id } },
        update: {},
        create: { publicationId: pub.id, keywordId: keyword.id, keywordType: 'AUTHOR' },
      })
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      publicationId: pub.id,
      userId: user.id,
      action: 'CREATE',
      newValue: { title: pub.title, year: pub.year },
    },
  })

  return NextResponse.json(pub, { status: 201 })
}
