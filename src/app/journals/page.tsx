import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Search } from 'lucide-react'

interface SearchParams {
  q?: string
  page?: string
}

export default async function JournalsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parseInt(searchParams.page ?? '1')
  const take = 25
  const skip = (page - 1) * take

  const where: any = {}
  if (searchParams.q) {
    where.OR = [
      { title: { contains: searchParams.q, mode: 'insensitive' } },
      { issn: { contains: searchParams.q, mode: 'insensitive' } },
    ]
  }

  const [journals, total] = await Promise.all([
    prisma.journal.findMany({
      where,
      orderBy: { title: 'asc' },
      include: {
        publisher: { select: { name: true } },
        _count: { select: { publications: true } },
      },
      take,
      skip,
    }),
    prisma.journal.count({ where }),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journals & Publication Venues</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total venues in catalog</p>
        </div>
      </div>

      <form method="GET" className="flex gap-3 mb-5">
        <div className="relative">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search journal name or ISSN…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80 bg-white"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors">
          Search
        </button>
        {searchParams.q && (
          <Link href="/journals" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center font-medium">
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Journal / Venue Name</th>
                <th className="text-left px-4 py-3 font-medium">ISSN</th>
                <th className="text-left px-4 py-3 font-medium">Publisher</th>
                <th className="text-right px-4 py-3 font-medium">Articles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {journals.map(j => (
                <tr key={j.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link href={`/publications?q=${encodeURIComponent(j.title)}`} className="hover:text-blue-700 hover:underline">
                      {j.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{j.issn ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{j.publisher?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    <Link href={`/publications?q=${encodeURIComponent(j.title)}`} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                      {j._count.publications}
                    </Link>
                  </td>
                </tr>
              ))}
              {journals.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    No journals found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm bg-gray-50/40">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-700">{skip + 1}</span> to{' '}
              <span className="font-medium text-gray-700">{Math.min(skip + take, total)}</span> of{' '}
              <span className="font-medium text-gray-700">{total}</span> journals (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-1.5">
              {page > 1 && (
                <Link
                  href={`/journals?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), page: String(page - 1) })}`}
                  className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-xs transition-colors shadow-sm"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/journals?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), page: String(page + 1) })}`}
                  className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-xs transition-colors shadow-sm"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

