import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getStatusColor, getPublicationTypeLabel, ordinalAuthorPosition } from '@/lib/utils'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import VerifyActions from './VerifyActions'

export default async function PublicationDetailPage({ params }: { params: { id: string } }) {
  const [pub, session] = await Promise.all([
    prisma.publication.findUnique({
      where: { id: params.id },
      include: {
        journal: { include: { publisher: true } },
        authorships: {
          include: { author: true, department: true, affiliation: true },
          orderBy: { authorOrder: 'asc' },
        },
        indexing: true,
        keywords: { include: { keyword: true } },
        citations: { orderBy: { capturedOn: 'desc' }, take: 1 },
        verifications: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 5 },
      },
    }),
    auth(),
  ])

  if (!pub) notFound()

  const userRole = (session?.user as any)?.role ?? 'VIEWER'
  const canVerify = ['ADMIN', 'VERIFIER'].includes(userRole)
  const latestCitation = pub.citations[0]

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/publications" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={14} /> Back to Publications
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 leading-snug">{pub.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(pub.verificationStatus)}`}>
              {pub.verificationStatus}
            </span>
          </div>
        </div>
        {canVerify && pub.verificationStatus !== 'VERIFIED' && (
          <div className="mt-4">
            <VerifyActions publicationId={pub.id} currentStatus={pub.verificationStatus} />
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
          <span>{pub.year}</span>
          <span>·</span>
          <span>{getPublicationTypeLabel(pub.publicationType)}</span>
          {pub.journal && <><span>·</span><span>{pub.journal.title}</span></>}
          {pub.doi && (
            <><span>·</span>
            <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1">
              DOI <ExternalLink size={12} />
            </a></>
          )}
        </div>

        {pub.abstract && (
          <p className="mt-4 text-sm text-gray-600 leading-relaxed">{pub.abstract}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Authors */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Authors & Affiliations</h2>
          <div className="space-y-2">
            {pub.authorships.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {a.authorOrder}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{a.author.fullName}</span>
                    {a.isCorresponding && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">Corresponding</span>}
                    {a.internalAuthor && <span className="text-xs bg-green-100 text-green-700 px-1.5 rounded">Internal</span>}
                  </div>
                  {a.department && <p className="text-xs text-gray-400 mt-0.5">{a.department.name}</p>}
                  {a.author.orcid && <p className="text-xs text-gray-400 font-mono">ORCID: {a.author.orcid}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Indexing */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Indexing</h2>
            {pub.indexing ? (
              <div className="space-y-1.5">
                {[
                  ['Scopus', pub.indexing.indexedScopus],
                  ['Web of Science', pub.indexing.indexedWos],
                  ['PubMed', pub.indexing.indexedPubmed],
                  ['DOAJ', pub.indexing.indexedDoaj],
                  ['UGC-CARE', pub.indexing.indexedUgcCare],
                  ['Google Scholar', pub.indexing.indexedGoogleScholar],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {val ? 'Yes' : 'No'}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No indexing data</p>}
          </div>

          {/* Citations */}
          {latestCitation && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Citations</h2>
              <div className="space-y-1.5 text-sm">
                {latestCitation.citationsScopus != null && (
                  <div className="flex justify-between"><span className="text-gray-600">Scopus</span><span className="font-semibold">{latestCitation.citationsScopus}</span></div>
                )}
                {latestCitation.citationsWos != null && (
                  <div className="flex justify-between"><span className="text-gray-600">WoS</span><span className="font-semibold">{latestCitation.citationsWos}</span></div>
                )}
                <p className="text-xs text-gray-400 mt-1">Last updated: {latestCitation.capturedOn.toLocaleDateString()}</p>
              </div>
            </div>
          )}

          {/* Keywords */}
          {pub.keywords.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Keywords</h2>
              <div className="flex flex-wrap gap-1.5">
                {pub.keywords.map(pk => (
                  <span key={pk.keywordId} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {pk.keyword.keywordText}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
