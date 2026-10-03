import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const VerifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const user = session.user as any
  if (!['ADMIN', 'VERIFIER'].includes(user.role)) {
    return NextResponse.json({ error: 'Only Admins and Verifiers can verify publications' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const pub = await prisma.publication.findUnique({ where: { id: params.id } })
  if (!pub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [updated] = await prisma.$transaction([
    prisma.publication.update({
      where: { id: params.id },
      data: { verificationStatus: parsed.data.status },
    }),
    prisma.publicationVerification.create({
      data: {
        publicationId: params.id,
        userId: user.id,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
      },
    }),
    prisma.auditLog.create({
      data: {
        publicationId: params.id,
        userId: user.id,
        action: `VERIFY_${parsed.data.status}`,
        oldValue: { status: pub.verificationStatus },
        newValue: { status: parsed.data.status, notes: parsed.data.notes },
      },
    }),
  ])

  return NextResponse.json(updated)
}
