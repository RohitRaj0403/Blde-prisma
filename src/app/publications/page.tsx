import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getStatusColor, getPublicationTypeLabel, truncate } from '@/lib/utils'
import { Search, Filter, Plus, Upload } from 'lucide-react'
// Note: Plus imported for Add button

interface SearchParams {
  q?: string
  year?: string
  type?: string
  status?: string
  department?: string
  indexing?: string
  page?: string
}

async function getPublications(params: SearchParams) {
  const page = parseInt(params.page ?? '1')
  const take = 20
  const skip = (page - 1) * take

  const where: any = {}
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { doi: { contains: params.q, mode: 'insensitive' } },
      { authorships: { some: { author: { fullName: { contains: params.q, mode: 'insensitive' } } } } },
    ]
  }
  if (params.year) where.year = parseInt(params.year)
  if (params.type) where.publicationType = params.type
  if (params.status) where.verificationStatus = params.status
  if (params.department) {
    where.authorships = { some: { departmentId: params.department } }
  }
  if (params.indexing) {
    where.indexing = { [`indexed${params.indexing}`]: true }
  }

  const [publications, total] = await Promise.all([
    prisma.publication.findMany({
      where,
      take,
      skip,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      include: {
        journal: { select: { title: true } },
        indexing: true,
        authorships: {
          include: { author: { select: { fullName: true } } },
          orderBy: { authorOrder: 'asc' },
          take: 4,
        },
      },
    }),
    prisma.publication.count({ where }),
  ])

  return { publications, total, page, totalPages: Math.ceil(total / take) }
}

async function getFilterOptions() {
  const [departments, years] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.publication.groupBy({ by: ['year'], orderBy: { year: 'desc' } }),
  ])
  return { departments, years: years.map(y => y.year) }
}

export default async function PublicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ publications, total, page, totalPages }, { departments, years }] = await Promise.all([
    getPublications(searchParams),
    getFilterOptions(),
  ])

  const indexingOptions = ['Scopus', 'Wos', 'Pubmed', 'Doaj', 'UgcCare']
  const typeOptions = ['ARTICLE', 'REVIEW', 'CASE_REPORT', 'META_ANALYSIS', 'SYSTEMATIC_REVIEW', 'BOOK_CHAPTER', 'LETTER', 'EDITORIAL']
  const statusOptions = ['DRAFT', 'IMPORTED', 'PENDING', 'VERIFIED', 'REJECTED']

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Publications</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} records</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Upload size={16} /> Import
          </Link>
          <Link href="/publications/add" className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Add publication
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white border border-gray-100 rounded-xl p-4 mb-5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="col-span-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                defaultValue={searchParams.q}
                placeholder="Search title, DOI, author…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select name="year" defaultValue={searchParams.year} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select name="type" defaultValue={searchParams.type} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All types</option>
            {typeOptions.map(t => <option key={t} value={t}>{getPublicationTypeLabel(t)}</option>)}
          </select>

          <select name="status" defaultValue={searchParams.status} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All statuses</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select name="department" defaultValue={searchParams.department} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex gap-2 flex-wrap">
            {indexingOptions.map(idx => (
              <label key={idx} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="indexing" value={idx} defaultChecked={searchParams.indexing === idx} className="text-blue-600" />
                <span className="text-gray-600">{idx === 'UgcCare' ? 'UGC-CARE' : idx === 'Wos' ? 'WoS' : idx}</span>
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="indexing" value="" defaultChecked={!searchParams.indexing} />
              <span className="text-gray-600">All</span>
            </label>
          </div>
          <button type="submit" className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm rounded-lg hover:bg-blue-800 transition-colors">
            <Filter size={14} /> Apply
          </button>
          <Link href="/publications" className="text-sm text-gray-500 hover:text-gray-700">Clear</Link>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium w-1/2">Title</th>
                <th className="text-left px-4 py-3 font-medium">Year</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Journal</th>
                <th className="text-left px-4 py-3 font-medium">Indexing</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {publications.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No publications found.</td></tr>
              ) : (
                publications.map(pub => (
                  <tr key={pub.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/publications/${pub.id}`} className="font-medium text-gray-800 hover:text-blue-700 line-clamp-2">
                        {pub.title}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {pub.authorships.map(a => a.author.fullName).join(', ')}
                        {pub.authorships.length === 4 && ' et al.'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{pub.year}</td>
                    <td className="px-4 py-3 text-gray-600">{getPublicationTypeLabel(pub.publicationType)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{pub.journal ? truncate(pub.journal.title, 25) : '—'}</td>
                    <td className="px-4 py-3">
                      {pub.indexing && (
                        <div className="flex flex-wrap gap-1">
                          {pub.indexing.indexedScopus && <span className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded">Scopus</span>}
                          {pub.indexing.indexedWos && <span className="bg-purple-50 text-purple-700 text-xs px-1.5 py-0.5 rounded">WoS</span>}
                          {pub.indexing.indexedPubmed && <span className="bg-green-50 text-green-700 text-xs px-1.5 py-0.5 rounded">PubMed</span>}
                          {pub.indexing.indexedUgcCare && <span className="bg-orange-50 text-orange-700 text-xs px-1.5 py-0.5 rounded">UGC</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(pub.verificationStatus)}`}>
                        {pub.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/publications?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                  className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">← Prev</Link>
              )}
              {page < totalPages && (
                <Link href={`/publications?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                  className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">Next →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
