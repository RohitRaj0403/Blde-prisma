'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, BookOpen, ExternalLink, Calendar, Award, ArrowUpDown } from 'lucide-react'
import { getPublicationTypeLabel } from '@/lib/utils'

interface AuthorshipData {
  id: string
  publicationId: string
  authorOrder: number
  isCorresponding: boolean
  internalAuthor: boolean
  publication: {
    id: string
    title: string
    abstract: string | null
    doi: string | null
    pmid: string | null
    wosUid: string | null
    scopusEid: string | null
    publicationType: string
    year: number
    journal: {
      title: string
    } | null
    indexing: {
      indexedScopus: boolean
      indexedWos: boolean
      indexedPubmed: boolean
      indexedDoaj: boolean
      indexedUgcCare: boolean
      indexedGoogleScholar: boolean
    } | null
    citations: Array<{
      citationsScopus: number | null
      citationsWos: number | null
      citationsPubmed: number | null
    }>
    authorships: Array<{
      authorId: string
      authorOrder: number
      author: {
        fullName: string
      }
    }>
  }
}

export default function PublicationsTab({
  authorships,
  currentAuthorId,
}: {
  authorships: AuthorshipData[]
  currentAuthorId: string
}) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [sortBy, setSortBy] = useState('year-desc')
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  // Types list for filter dropdown
  const types = useMemo(() => {
    const list = new Set<string>()
    authorships.forEach(a => {
      list.add(a.publication.publicationType)
    })
    return Array.from(list)
  }, [authorships])

  // Filter and sort publications
  const filteredAndSorted = useMemo(() => {
    let result = [...authorships]

    // Apply Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(a => {
        const title = a.publication.title.toLowerCase()
        const doi = a.publication.doi?.toLowerCase() ?? ''
        const journal = a.publication.journal?.title.toLowerCase() ?? ''
        const coAuthors = a.publication.authorships
          .map(auth => auth.author.fullName.toLowerCase())
          .join(' ')
        return title.includes(q) || doi.includes(q) || journal.includes(q) || coAuthors.includes(q)
      })
    }

    // Apply Type Filter
    if (selectedType !== 'ALL') {
      result = result.filter(a => a.publication.publicationType === selectedType)
    }

    // Apply Sorting
    result.sort((a, b) => {
      const latestA = a.publication.citations?.[0]
      const latestB = b.publication.citations?.[0]
      
      const scopusCitationsA = latestA?.citationsScopus ?? 0
      const scopusCitationsB = latestB?.citationsScopus ?? 0
      
      const wosCitationsA = latestA?.citationsWos ?? 0
      const wosCitationsB = latestB?.citationsWos ?? 0

      switch (sortBy) {
        case 'year-desc':
          return b.publication.year - a.publication.year
        case 'year-asc':
          return a.publication.year - b.publication.year
        case 'citations-scopus-desc':
          return scopusCitationsB - scopusCitationsA
        case 'citations-wos-desc':
          return wosCitationsB - wosCitationsA
        default:
          return 0
      }
    })

    return result
  }, [authorships, search, selectedType, sortBy])

  // Paginated publications
  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredAndSorted.slice(start, start + itemsPerPage)
  }, [filteredAndSorted, page])

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)

  // Reset page when filters change
  const handleFilterChange = (filterType: 'search' | 'type' | 'sort', value: string) => {
    if (filterType === 'search') setSearch(value)
    if (filterType === 'type') setSelectedType(value)
    if (filterType === 'sort') setSortBy(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleFilterChange('search', e.target.value)}
            placeholder="Search publications by title, journal, doi, or author..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          {/* Publication Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>Type:</span>
            <select
              value={selectedType}
              onChange={e => handleFilterChange('type', e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
            >
              <option value="ALL">All Types</option>
              {types.map(t => (
                <option key={t} value={t}>
                  {getPublicationTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>Sort By:</span>
            <select
              value={sortBy}
              onChange={e => handleFilterChange('sort', e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
            >
              <option value="year-desc">Year (Newest First)</option>
              <option value="year-asc">Year (Oldest First)</option>
              <option value="citations-scopus-desc">Citations (Scopus - High to Low)</option>
              <option value="citations-wos-desc">Citations (WoS - High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Publications List */}
      <div className="space-y-3">
        {paginated.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-12 text-center text-gray-400">
            <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No publications matched your search criteria.</p>
          </div>
        ) : (
          paginated.map(({ publication, authorOrder }) => {
            const latestSnapshot = publication.citations?.[0]
            const hasScopusCits = latestSnapshot?.citationsScopus !== null && latestSnapshot?.citationsScopus !== undefined
            const hasWosCits = latestSnapshot?.citationsWos !== null && latestSnapshot?.citationsWos !== undefined
            const hasPubmedCits = latestSnapshot?.citationsPubmed !== null && latestSnapshot?.citationsPubmed !== undefined

            return (
              <div
                key={publication.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold tracking-wide">
                      {getPublicationTypeLabel(publication.publicationType)}
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                      <Calendar size={10} /> {publication.year}
                    </span>
                    
                    {/* Indexing Badges */}
                    {publication.indexing && (
                      <div className="flex gap-1.5">
                        {publication.indexing.indexedScopus && (
                          <span className="bg-orange-50 text-orange-700 text-[10px] px-2 py-0.5 rounded-md font-medium border border-orange-100">
                            Scopus
                          </span>
                        )}
                        {publication.indexing.indexedWos && (
                          <span className="bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-md font-medium border border-purple-100">
                            WoS
                          </span>
                        )}
                        {publication.indexing.indexedPubmed && (
                          <span className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-md font-medium border border-green-100">
                            PubMed
                          </span>
                        )}
                        {publication.indexing.indexedUgcCare && (
                          <span className="bg-yellow-50 text-yellow-800 text-[10px] px-2 py-0.5 rounded-md font-medium border border-yellow-100">
                            UGC CARE
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-gray-950 text-sm md:text-base leading-snug">
                    <Link
                      href={`/publications/${publication.id}`}
                      className="hover:text-blue-700 transition-colors"
                    >
                      {publication.title}
                    </Link>
                  </h3>

                  {/* Authors list with current author highlighted */}
                  <p className="text-xs text-gray-500 font-medium">
                    {publication.authorships
                      .sort((a, b) => a.authorOrder - b.authorOrder)
                      .map((auth, idx) => {
                        const isCurrent = auth.authorId === currentAuthorId
                        return (
                          <span key={auth.authorId}>
                            {idx > 0 && ', '}
                            {isCurrent ? (
                              <span className="text-blue-700 font-bold underline">
                                {auth.author.fullName}
                              </span>
                            ) : (
                              <span>{auth.author.fullName}</span>
                            )}
                          </span>
                        )
                      })}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                    {publication.journal && (
                      <span className="italic font-medium text-gray-600">
                        {publication.journal.title}
                      </span>
                    )}
                    {publication.doi && (
                      <a
                        href={`https://doi.org/${publication.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-mono"
                      >
                        DOI: {publication.doi} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Citations Counters (if any citations exist) */}
                <div className="flex md:flex-col gap-2 shrink-0 self-end md:self-center">
                  {latestSnapshot && (hasScopusCits || hasWosCits || hasPubmedCits) ? (
                    <>
                      {hasScopusCits && (
                        <div className="flex items-center justify-between gap-3 bg-orange-50/50 border border-orange-100 rounded-xl px-3 py-1.5 text-center min-w-[100px]">
                          <span className="text-[10px] text-orange-700 font-bold uppercase">Scopus</span>
                          <span className="text-sm font-extrabold text-orange-950">
                            {latestSnapshot.citationsScopus}
                          </span>
                        </div>
                      )}
                      {hasWosCits && (
                        <div className="flex items-center justify-between gap-3 bg-purple-50/50 border border-purple-100 rounded-xl px-3 py-1.5 text-center min-w-[100px]">
                          <span className="text-[10px] text-purple-700 font-bold uppercase">WoS</span>
                          <span className="text-sm font-extrabold text-purple-950">
                            {latestSnapshot.citationsWos}
                          </span>
                        </div>
                      )}
                      {hasPubmedCits && (
                        <div className="flex items-center justify-between gap-3 bg-green-50/50 border border-green-100 rounded-xl px-3 py-1.5 text-center min-w-[100px]">
                          <span className="text-[10px] text-green-700 font-bold uppercase">PubMed</span>
                          <span className="text-sm font-extrabold text-green-950">
                            {latestSnapshot.citationsPubmed}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 font-medium italic border border-gray-100 rounded-xl px-3 py-1 bg-slate-50/50">
                      0 Citations
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 px-2">
          <p className="text-xs text-gray-500 font-medium">
            Showing <span className="font-semibold">{((page - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-semibold">
              {Math.min(page * itemsPerPage, filteredAndSorted.length)}
            </span>{' '}
            of <span className="font-semibold">{filteredAndSorted.length}</span> publications
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
