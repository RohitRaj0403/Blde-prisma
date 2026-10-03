import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const currentUser = session.user as any
  // Admins can edit anyone; users can edit themselves (limited fields)
  const isSelf = currentUser.id === params.id
  if (currentUser.role !== 'ADMIN' && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updateData: any = {}

  if (body.name) updateData.name = body.name
  if (body.password) updateData.password = await bcrypt.hash(body.password, 12)

  // Only admins can change role or department
  if (currentUser.role === 'ADMIN') {
    if (body.role) updateData.role = body.role
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const currentUser = session.user as any
  if (currentUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (currentUser.id === params.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
