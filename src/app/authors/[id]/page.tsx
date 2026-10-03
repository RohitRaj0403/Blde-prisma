import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import FacultyAvatar from '@/components/FacultyAvatar'
import { 
  ArrowLeft, 
  Edit, 
  Globe, 
  Award, 
  BookOpen, 
  ExternalLink, 
  MapPin, 
  Building, 
  Users, 
  Calendar, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Star,
  Plus
} from 'lucide-react'
import PublicationsTab from './PublicationsTab'

export default async function AuthorProfilePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string }
}) {
  const session = await auth()
  const user = session?.user as any

  const author = await prisma.author.findUnique({
    where: { id: params.id },
    include: {
      primaryDept: true,
      user: {
        select: {
          email: true,
        }
      },
      authorships: {
        include: {
          publication: {
            include: {
              journal: true,
              indexing: true,
              citations: {
                orderBy: {
                  capturedOn: 'desc',
                },
                take: 1,
              },
              authorships: {
                include: {
                  author: {
                    select: {
                      id: true,
                      fullName: true,
                      photoUrl: true,
                      primaryDept: {
                        select: { name: true }
                      }
                    }
                  }
                }
              }
            },
          },
        },
        orderBy: {
          publication: {
            year: 'desc',
          },
        },
      },
    },
  })

  if (!author) {
    notFound()
  }

  const activeTab = searchParams.tab ?? 'cv'

  // Permission check: Admin, Verifier, or the owner
  const isOwner = author.userId === user?.id
  const canEdit = ['ADMIN', 'VERIFIER'].includes(user?.role) || isOwner

  // ─── Metrics Calculation ───────────────────────────────────────────────────
  const totalPublications = author.authorships.length
  
  const scopusPublications = author.authorships.filter(
    a => a.publication.indexing?.indexedScopus
  ).length
  const wosPublications = author.authorships.filter(
    a => a.publication.indexing?.indexedWos
  ).length
  const pubmedPublications = author.authorships.filter(
    a => a.publication.indexing?.indexedPubmed
  ).length

  const scopusCitations = author.authorships.reduce(
    (sum, a) => sum + (a.publication.citations?.[0]?.citationsScopus ?? 0), 0
  )
  const wosCitations = author.authorships.reduce(
    (sum, a) => sum + (a.publication.citations?.[0]?.citationsWos ?? 0), 0
  )
  const pubmedCitations = author.authorships.reduce(
    (sum, a) => sum + (a.publication.citations?.[0]?.citationsPubmed ?? 0), 0
  )
  const totalCitations = scopusCitations + wosCitations + pubmedCitations

  // Calculate H-Index dynamically based on seeded citations
  const scopusCitationCounts = author.authorships
    .map(a => a.publication.citations?.[0]?.citationsScopus ?? 0)
    .sort((a, b) => b - a)
  let scopusHIndex = 0
  for (let i = 0; i < scopusCitationCounts.length; i++) {
    if (scopusCitationCounts[i] >= i + 1) {
      scopusHIndex = i + 1
    } else {
      break
    }
  }

  const wosCitationCounts = author.authorships
    .map(a => a.publication.citations?.[0]?.citationsWos ?? 0)
    .sort((a, b) => b - a)
  let wosHIndex = 0
  for (let i = 0; i < wosCitationCounts.length; i++) {
    if (wosCitationCounts[i] >= i + 1) {
      wosHIndex = i + 1
    } else {
      break
    }
  }

  // ─── Co-Authors Aggregation ────────────────────────────────────────────────
  const coAuthorMap = new Map<
    string,
    { id: string; name: string; photoUrl: string | null; dept: string | null; count: number }
  >()

  author.authorships.forEach(a => {
    a.publication.authorships.forEach(authShip => {
      if (authShip.authorId !== author.id) {
        const current = coAuthorMap.get(authShip.authorId)
        if (current) {
          current.count += 1
        } else {
          coAuthorMap.set(authShip.authorId, {
            id: authShip.authorId,
            name: authShip.author.fullName,
            photoUrl: authShip.author.photoUrl,
            dept: authShip.author.primaryDept?.name ?? null,
            count: 1,
          })
        }
      }
    })
  })
  const coAuthors = Array.from(coAuthorMap.values()).sort((a, b) => b.count - a.count)

  // Split education and experience text areas to arrays for rendering a timeline
  const educationItems = author.education
    ? author.education.split('\n').map(line => line.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean)
    : []

  const experienceItems = author.experience
    ? author.experience.split('\n').map(line => line.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean)
    : []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/authors" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={14} /> Back to Authors Directory
      </Link>

      {/* 1. Header Card with Banner Gradient */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Cover Banner */}
        <div className="h-44 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 relative overflow-hidden flex items-end p-6">
          {/* Cover decoration: subtle mesh grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0c_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
            {/* Avatar Photo (Floats Over Banner) */}
            <div className="relative -mt-16 shrink-0">
              <FacultyAvatar name={author.fullName} photoUrl={author.photoUrl} size="xl" />
            </div>

            {/* Title / Description */}
            <div className="pt-2 md:pt-4 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tight leading-tight">
                  {author.fullName}
                </h1>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-100">
                  <Star size={11} className="fill-blue-700" /> Faculty Profile
                </span>
              </div>
              
              <p className="text-gray-500 text-sm md:text-base font-semibold flex items-center gap-1.5">
                <Building size={16} className="text-gray-400" />
                {author.primaryDept?.name ?? 'General Faculty'}
              </p>
              <p className="text-gray-400 text-xs font-semibold flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" />
                {author.primaryDept?.college ?? 'BLDE University'} • Vijayapura, Karnataka
              </p>
            </div>
          </div>

          {/* Edit Profile Button */}
          {canEdit && (
            <Link
              href={`/authors/${author.id}/edit`}
              className="mt-2 md:mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm border border-blue-800"
            >
              <Edit size={14} /> Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* 2. Content Grid (Sidebars + Main Tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Identities & Metrics Overview) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* 2a. Academic & Research Identities Widget */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Research Identities
            </h2>
            
            <div className="space-y-3">
              {/* Vidwan ID */}
              <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold text-gray-700">Vidwan ID</span>
                </div>
                {author.vidwanId ? (
                  <a
                    href={`https://vidwan.inflibnet.ac.in/profile/${author.vidwanId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    {author.vidwanId} <ExternalLink size={12} />
                  </a>
                ) : canEdit ? (
                  <Link href={`/authors/${author.id}/edit`} className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-blue-600 font-medium italic">
                    <Plus size={11} /> Add Vidwan ID
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not Linked</span>
                )}
              </div>

              {/* ORCID */}
              <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-xs font-bold text-gray-700">ORCID iD</span>
                </div>
                {author.orcid ? (
                  <a
                    href={`https://orcid.org/${author.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold font-mono"
                  >
                    {author.orcid} <ExternalLink size={12} />
                  </a>
                ) : canEdit ? (
                  <Link href={`/authors/${author.id}/edit`} className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-blue-600 font-medium italic">
                    <Plus size={11} /> Add ORCID
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not Linked</span>
                )}
              </div>

              {/* Scopus */}
              <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                  <span className="text-xs font-bold text-gray-700">Scopus ID</span>
                </div>
                {author.scopusAuthorId ? (
                  <a
                    href={`https://www.scopus.com/authid/detail.uri?authorId=${author.scopusAuthorId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold font-mono"
                  >
                    {author.scopusAuthorId} <ExternalLink size={12} />
                  </a>
                ) : canEdit ? (
                  <Link href={`/authors/${author.id}/edit`} className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-blue-600 font-medium italic">
                    <Plus size={11} /> Add Scopus ID
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not Linked</span>
                )}
              </div>

              {/* ResearcherID */}
              <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="text-xs font-bold text-gray-700">ResearcherID</span>
                </div>
                {author.researcherId ? (
                  <a
                    href={`https://www.webofscience.com/wos/author/record/${author.researcherId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold font-mono"
                  >
                    {author.researcherId} <ExternalLink size={12} />
                  </a>
                ) : canEdit ? (
                  <Link href={`/authors/${author.id}/edit`} className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-blue-600 font-medium italic">
                    <Plus size={11} /> Add ResearcherID
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not Linked</span>
                )}
              </div>

              {/* Google Scholar */}
              <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-gray-700">Google Scholar</span>
                </div>
                {author.googleScholarId ? (
                  <a
                    href={`https://scholar.google.com/citations?user=${author.googleScholarId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold font-mono"
                  >
                    Scholar ID <ExternalLink size={12} />
                  </a>
                ) : canEdit ? (
                  <Link href={`/authors/${author.id}/edit`} className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-blue-600 font-medium italic">
                    <Plus size={11} /> Add Scholar ID
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not Linked</span>
                )}
              </div>
            </div>

            {/* Email / Contact details */}
            {author.user?.email && (
              <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <Mail size={14} className="text-gray-400" />
                <span className="truncate">{author.user.email}</span>
              </div>
            )}
          </div>

          {/* 2b. Citations & h-index Dashboard Metrics Widget */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Citation Metrics
            </h2>

            {/* Metric Counters Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Publications counter */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 text-center">
                <div className="text-2xl font-black text-gray-900">{totalPublications}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Publications</div>
              </div>

              {/* Citations counter */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-center">
                <div className="text-2xl font-black text-blue-700">{totalCitations}</div>
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">Total Citations</div>
              </div>
            </div>

            {/* Detailed metrics table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="text-left py-2 px-3">Database</th>
                    <th className="text-center py-2 px-3">Citations</th>
                    <th className="text-center py-2 px-3">h-index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-700">Scopus</td>
                    <td className="text-center py-2 px-3 font-bold text-orange-700">{scopusCitations}</td>
                    <td className="text-center py-2 px-3 font-black text-orange-900">{scopusHIndex}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-700">Web of Science</td>
                    <td className="text-center py-2 px-3 font-bold text-purple-700">{wosCitations}</td>
                    <td className="text-center py-2 px-3 font-black text-purple-900">{wosHIndex}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-700">PubMed</td>
                    <td className="text-center py-2 px-3 font-bold text-green-700">{pubmedCitations}</td>
                    <td className="text-center py-2 px-3 font-black text-green-900">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Indexed publications summary */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Indexed Count</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-orange-50/50 border border-orange-100 text-orange-800 text-[10px] py-1 text-center font-bold rounded-lg">
                  Scopus: {scopusPublications}
                </div>
                <div className="flex-1 bg-purple-50/50 border border-purple-100 text-purple-800 text-[10px] py-1 text-center font-bold rounded-lg">
                  WoS: {wosPublications}
                </div>
                <div className="flex-1 bg-green-50/50 border border-green-100 text-green-800 text-[10px] py-1 text-center font-bold rounded-lg">
                  PubMed: {pubmedPublications}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Tabs & Detailed CV / Publications / Co-Authors Lists) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tab Selector */}
          <div className="flex border-b border-gray-200">
            <Link
              href={`/authors/${author.id}?tab=cv`}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                activeTab === 'cv'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Award size={15} /> Academic CV
              </div>
            </Link>
            
            <Link
              href={`/authors/${author.id}?tab=publications`}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                activeTab === 'publications'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <BookOpen size={15} /> Publications ({totalPublications})
              </div>
            </Link>

            <Link
              href={`/authors/${author.id}?tab=coauthors`}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                activeTab === 'coauthors'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users size={15} /> Co-Authors ({coAuthors.length})
              </div>
            </Link>
          </div>

          {/* 3. Tab Contents */}
          {activeTab === 'cv' && (
            <div className="space-y-6">
              {/* Bio Card */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" /> Biography
                </h3>
                {author.bio ? (
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {author.bio}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm italic">No biography provided yet.</p>
                )}
              </div>

              {/* Grid for Education & Experience Timelines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Education Timeline */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Award size={16} className="text-blue-600" /> Education & Qualifications
                  </h3>
                  {educationItems.length > 0 ? (
                    <div className="space-y-4">
                      {educationItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-start relative group">
                          {/* Circle dot and line */}
                          <div className="flex flex-col items-center shrink-0 relative h-full">
                            <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100 mt-1 z-10"></div>
                            {idx < educationItems.length - 1 && (
                              <div className="w-0.5 bg-gray-100 absolute top-4 bottom-[-16px] left-1/2 -translate-x-1/2"></div>
                            )}
                          </div>
                          <div className="pb-1">
                            <p className="text-xs md:text-sm text-gray-800 font-semibold leading-relaxed">{item}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No education history details provided.</p>
                  )}
                </div>

                {/* Experience Timeline */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600" /> Professional Experience
                  </h3>
                  {experienceItems.length > 0 ? (
                    <div className="space-y-4">
                      {experienceItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-start relative group">
                          {/* Circle dot and line */}
                          <div className="flex flex-col items-center shrink-0 relative h-full">
                            <div className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-100 mt-1 z-10"></div>
                            {idx < experienceItems.length - 1 && (
                              <div className="w-0.5 bg-gray-100 absolute top-4 bottom-[-16px] left-1/2 -translate-x-1/2"></div>
                            )}
                          </div>
                          <div className="pb-1">
                            <p className="text-xs md:text-sm text-gray-800 font-semibold leading-relaxed">{item}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No professional experience details provided.</p>
                  )}
                </div>
              </div>

              {/* Research Interests / Expertise Cloud */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Globe size={16} className="text-blue-600" /> Areas of Research & Expertise
                </h3>
                {author.expertise && author.expertise.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {author.expertise.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl font-bold border border-blue-100 shadow-sm hover:bg-blue-100 hover:text-blue-800 transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">No expertise areas listed yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Publications Tab with Client Filtering & Citation Counters */}
          {activeTab === 'publications' && (
            <PublicationsTab 
              authorships={author.authorships as any} 
              currentAuthorId={author.id} 
            />
          )}

          {/* Co-Authors Grid */}
          {activeTab === 'coauthors' && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users size={16} className="text-blue-600" /> Co-Authors Network
              </h3>
              
              {coAuthors.length === 0 ? (
                <p className="text-gray-400 text-sm italic text-center py-8">
                  No co-authors in the system records for this researcher.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {coAuthors.map(co => (
                    <Link
                      href={`/authors/${co.id}`}
                      key={co.id}
                      className="flex gap-3 items-center p-3 border border-gray-50 rounded-xl hover:bg-slate-50/80 transition-all group"
                    >
                      {/* Co-author avatar */}
                      <FacultyAvatar name={co.name} photoUrl={co.photoUrl} size="md" />

                      {/* Co-author details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-950 truncate group-hover:text-blue-700 transition-colors">
                          {co.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate">{co.dept ?? 'General Department'}</p>
                      </div>

                      {/* Co-authored publications count badge */}
                      <div className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-bold shrink-0">
                        {co.count} {co.count === 1 ? 'paper' : 'papers'}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
