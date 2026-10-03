import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import DashboardClient from './DashboardClient'

async function getDashboardData() {
  const [
    totalPublications,
    verifiedCount,
    pendingCount,
    totalAuthors,
    totalDepartments,
    yearWise,
    scopusCount,
    wosCount,
    pubmedCount,
    doajCount,
    ugcCount,
    typeCounts,
    recentPublications,
  ] = await Promise.all([
    prisma.publication.count(),
    prisma.publication.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.publication.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.author.count(),
    prisma.department.count(),
    // Year-wise counts
    prisma.publication.groupBy({ by: ['year'], _count: true, orderBy: { year: 'asc' }, take: 8 }),
    // Indexing counts
    prisma.publicationIndexing.count({ where: { indexedScopus: true } }),
    prisma.publicationIndexing.count({ where: { indexedWos: true } }),
    prisma.publicationIndexing.count({ where: { indexedPubmed: true } }),
    prisma.publicationIndexing.count({ where: { indexedDoaj: true } }),
    prisma.publicationIndexing.count({ where: { indexedUgcCare: true } }),
    // Type distribution
    prisma.publication.groupBy({ by: ['publicationType'], _count: true }),
    // Recent
    prisma.publication.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { journal: true, authorships: { include: { author: true }, orderBy: { authorOrder: 'asc' }, take: 3 } },
    }),
  ])

  // Fetch all publications and their latest citations for global metrics
  const allPublications = await prisma.publication.findMany({
    include: {
      citations: {
        orderBy: { capturedOn: 'desc' },
        take: 1
      }
    }
  })

  // Calculate global citation sums
  const globalScopusCitations = allPublications.reduce((sum, p) => sum + (p.citations?.[0]?.citationsScopus ?? 0), 0)
  const globalWosCitations = allPublications.reduce((sum, p) => sum + (p.citations?.[0]?.citationsWos ?? 0), 0)
  const globalPubMedCitations = allPublications.reduce((sum, p) => sum + (p.citations?.[0]?.citationsPubmed ?? 0), 0)
  const globalTotalCitations = globalScopusCitations + globalWosCitations + globalPubMedCitations

  // Calculate global university h-index
  const globalScopusCounts = allPublications
    .map(p => p.citations?.[0]?.citationsScopus ?? 0)
    .sort((a, b) => b - a)
  let globalScopusH = 0
  for (let i = 0; i < globalScopusCounts.length; i++) {
    if (globalScopusCounts[i] >= i + 1) globalScopusH = i + 1
    else break
  }

  const globalWosCounts = allPublications
    .map(p => p.citations?.[0]?.citationsWos ?? 0)
    .sort((a, b) => b - a)
  let globalWosH = 0
  for (let i = 0; i < globalWosCounts.length; i++) {
    if (globalWosCounts[i] >= i + 1) globalWosH = i + 1
    else break
  }

  // Fetch all authors with papers and citation snapshots to build the Top Cited Leaders
  const authorsWithCitations = await prisma.author.findMany({
    include: {
      primaryDept: { select: { name: true } },
      authorships: {
        include: {
          publication: {
            include: {
              citations: {
                orderBy: { capturedOn: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    }
  })

  const leaderboard = authorsWithCitations.map(author => {
    const scopus = author.authorships.reduce((sum, a) => sum + (a.publication.citations?.[0]?.citationsScopus ?? 0), 0)
    const wos = author.authorships.reduce((sum, a) => sum + (a.publication.citations?.[0]?.citationsWos ?? 0), 0)
    const pubmed = author.authorships.reduce((sum, a) => sum + (a.publication.citations?.[0]?.citationsPubmed ?? 0), 0)
    const total = scopus + wos + pubmed
    return {
      id: author.id,
      fullName: author.fullName,
      designation: author.designation ?? 'Faculty',
      photoUrl: author.photoUrl,
      department: author.primaryDept?.name ?? 'General',
      publicationsCount: author.authorships.length,
      citations: total,
      scopus,
      wos
    }
  }).sort((a, b) => b.citations - a.citations).slice(0, 5)

  // Fetch top 10 keywords by count of publications using them
  const keywordCounts = await prisma.publicationKeyword.groupBy({
    by: ['keywordId'],
    _count: { publicationId: true },
    orderBy: { _count: { publicationId: 'desc' } },
    take: 10
  })

  const topKeywords = await Promise.all(
    keywordCounts.map(async (kc) => {
      const kw = await prisma.keyword.findUnique({ where: { id: kc.keywordId } })
      return {
        text: kw?.keywordText ?? '',
        count: kc._count.publicationId
      }
    })
  )

  // Calculate publications share by department (Map of Science)
  const deptsWithPubs = await prisma.department.findMany({
    include: {
      authorships: {
        select: { publicationId: true }
      }
    }
  })

  const deptShare = deptsWithPubs.map(d => {
    const uniquePubIds = new Set(d.authorships.map(a => a.publicationId))
    return {
      name: d.name,
      value: uniquePubIds.size
    }
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  const indexingCounts = {
    Scopus: scopusCount,
    WoS: wosCount,
    PubMed: pubmedCount,
    DOAJ: doajCount,
    'UGC-CARE': ugcCount,
  }

  return {
    stats: { totalPublications, verifiedCount, pendingCount, totalAuthors, totalDepartments },
    globalMetrics: {
      totalCitations: globalTotalCitations,
      scopusCitations: globalScopusCitations,
      wosCitations: globalWosCitations,
      scopusHIndex: globalScopusH,
      wosHIndex: globalWosH
    },
    yearWise: yearWise.map(r => ({ year: r.year.toString(), count: r._count })),
    indexingCounts: Object.entries(indexingCounts).map(([name, count]) => ({ name, count })),
    typeCounts: typeCounts.map(r => ({ type: r.publicationType, count: r._count })),
    recentPublications,
    leaderboard,
    topKeywords: topKeywords.filter(k => k.text),
    deptShare
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const data = await getDashboardData()
  return <DashboardClient data={data as any} userName={(session?.user as any)?.name ?? 'User'} />
}
