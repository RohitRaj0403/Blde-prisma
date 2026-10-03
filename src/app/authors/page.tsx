import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import FacultyAvatar from '@/components/FacultyAvatar'

export default async function AuthorsPage({ 
  searchParams 
}: { 
  searchParams: { q?: string; dept?: string; designation?: string; school?: string; page?: string } 
}) {
  const page = parseInt(searchParams.page ?? '1')
  const take = 24
  const skip = (page - 1) * take

  const where: any = {}
  if (searchParams.q) {
    where.OR = [
      { fullName: { contains: searchParams.q, mode: 'insensitive' } },
      { nameVariants: { has: searchParams.q } },
    ]
  }
  if (searchParams.dept) where.primaryDeptId = searchParams.dept
  if (searchParams.designation) where.designation = searchParams.designation
  if (searchParams.school) where.school = searchParams.school

  const [authors, total, departments, designationsData, schoolsData] = await Promise.all([
    prisma.author.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        _count: { select: { authorships: true } },
        primaryDept: { select: { name: true } },
      },
      take,
      skip,
    }),
    prisma.author.count({ where }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.author.findMany({
      where: { designation: { not: null } },
      select: { designation: true },
      distinct: ['designation'],
      orderBy: { designation: 'asc' },
    }),
    prisma.author.findMany({
      where: { school: { not: null } },
      select: { school: true },
      distinct: ['school'],
      orderBy: { school: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / take)
  const designations = designationsData.map(d => d.designation).filter(Boolean) as string[]
  const schools = schoolsData.map(s => s.school).filter(Boolean) as string[]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Authors & Faculty Directory</h1>
        <p className="text-gray-500 text-sm mt-0.5">{total} faculty members</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6 bg-slate-50/50 p-4 border border-gray-100 rounded-xl">
        <input 
          name="q" 
          defaultValue={searchParams.q} 
          placeholder="Search name…"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-60 bg-white" 
        />
        
        <select 
          name="dept" 
          defaultValue={searchParams.dept}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select 
          name="designation" 
          defaultValue={searchParams.designation}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All designations</option>
          {designations.map(desg => <option key={desg} value={desg}>{desg}</option>)}
        </select>

        <select 
          name="school" 
          defaultValue={searchParams.school}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All schools/colleges</option>
          {schools.map(sch => <option key={sch} value={sch}>{sch}</option>)}
        </select>

        <button type="submit" className="px-4 py-2 bg-blue-700 text-white text-sm rounded-lg hover:bg-blue-800 font-semibold shadow-sm transition-colors">Search</button>
        <Link href="/authors" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold flex items-center">Clear</Link>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {authors.map(author => (
          <div key={author.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex gap-4">
            {/* Avatar / Photo */}
            <FacultyAvatar name={author.fullName} photoUrl={author.photoUrl} size="lg" />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate hover:text-blue-700">
                    <Link href={`/authors/${author.id}`}>
                      {author.fullName}
                    </Link>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {author.designation ? `${author.designation} · ` : ''}
                    {author.primaryDept?.name ?? 'No department'}
                  </p>
                  {author.school && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{author.school}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-blue-700 leading-none">{author._count.authorships}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">publications</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {author.vidwanId && <span className="text-[10px] bg-orange-50 text-orange-800 px-1.5 py-0.5 rounded font-bold border border-orange-100">Vidwan</span>}
                  {author.orcid && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-100">ORCID</span>}
                  {author.scopusAuthorId && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-100">Scopus</span>}
                  {author.researcherId && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-100">WoS ID</span>}
                  {author.googleScholarId && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100">GS</span>}
                </div>
                <Link href={`/authors/${author.id}`} className="text-xs text-blue-700 hover:text-blue-800 font-bold whitespace-nowrap shrink-0">
                  View Profile →
                </Link>
              </div>
            </div>
          </div>
        ))}
        {authors.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">No authors found.</div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 mt-6 bg-white border border-gray-100 rounded-xl shadow-sm text-sm">
          <span className="text-gray-500">
            Showing <span className="font-medium text-gray-700">{skip + 1}</span> to{' '}
            <span className="font-medium text-gray-700">{Math.min(skip + take, total)}</span> of{' '}
            <span className="font-medium text-gray-700">{total}</span> faculty members (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            {page > 1 && (
              <Link
                href={`/authors?${new URLSearchParams({
                  ...(searchParams.q ? { q: searchParams.q } : {}),
                  ...(searchParams.dept ? { dept: searchParams.dept } : {}),
                  ...(searchParams.designation ? { designation: searchParams.designation } : {}),
                  ...(searchParams.school ? { school: searchParams.school } : {}),
                  page: String(page - 1),
                })}`}
                className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-xs transition-colors shadow-sm"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/authors?${new URLSearchParams({
                  ...(searchParams.q ? { q: searchParams.q } : {}),
                  ...(searchParams.dept ? { dept: searchParams.dept } : {}),
                  ...(searchParams.designation ? { designation: searchParams.designation } : {}),
                  ...(searchParams.school ? { school: searchParams.school } : {}),
                  page: String(page + 1),
                })}`}
                className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-xs transition-colors shadow-sm"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
