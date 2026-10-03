'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { BookOpen, Users, Building2, CheckCircle, Clock, Award, Star, TrendingUp, Tags, ChevronRight } from 'lucide-react'
import { getPublicationTypeLabel, truncate } from '@/lib/utils'
import Link from 'next/link'
import FacultyAvatar from '@/components/FacultyAvatar'

const COLORS = ['#1d4ed8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9']
const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']

interface Researcher {
  id: string
  fullName: string
  designation: string
  photoUrl: string | null
  department: string
  publicationsCount: number
  citations: number
  scopus: number
  wos: number
}

interface Keyword {
  text: string
  count: number
}

interface Props {
  data: {
    stats: { 
      totalPublications: number
      verifiedCount: number
      pendingCount: number
      totalAuthors: number
      totalDepartments: number 
    }
    globalMetrics: {
      totalCitations: number
      scopusCitations: number
      wosCitations: number
      scopusHIndex: number
      wosHIndex: number
    }
    yearWise: { year: string; count: number }[]
    indexingCounts: { name: string; count: number }[]
    typeCounts: { type: string; count: number }[]
    recentPublications: any[]
    leaderboard: Researcher[]
    topKeywords: Keyword[]
    deptShare: { name: string; value: number }[]
  }
  userName: string
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-black text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 font-semibold">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-sm shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardClient({ data, userName }: Props) {
  const { stats, globalMetrics, yearWise, indexingCounts, typeCounts, recentPublications, leaderboard, topKeywords, deptShare } = data

  // Aggregate Top 5 Departments + Others for clean visualization
  const topDepts = deptShare.slice(0, 5)
  const otherDeptSum = deptShare.slice(5).reduce((sum, d) => sum + d.value, 0)
  const formattedDeptShare = [
    ...topDepts.map(d => ({
      name: d.name.replace(/^Department of\s+/i, ''),
      fullName: d.name,
      value: d.value,
    })),
    ...(otherDeptSum > 0 ? [{ 
      name: 'Other Depts', 
      fullName: `Other ${deptShare.length - 5} Departments`, 
      value: otherDeptSum 
    }] : [])
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <h1 className="text-xl md:text-3xl font-black text-white leading-tight">
            {userName === 'Admin IQAC' || userName?.toLowerCase() === 'admin' ? 'Welcome, Admin' : `Welcome, ${userName}`}
          </h1>
          <p className="text-blue-100/70 text-xs md:text-sm font-semibold max-w-xl">
            Explore and manage BLDE (Deemed to be University) research publications, citations, and scholarly impact metrics.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          <Link href="/publications/add" className="bg-white hover:bg-slate-50 text-blue-900 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm">
            Add Publication
          </Link>
          <Link href="/import" className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm border border-blue-800">
            Import CSV
          </Link>
        </div>
      </div>

      {/* 1. Macro Institutional Stats (IRINS-Style Overview) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={BookOpen} label="Publications" value={stats.totalPublications} sub="Total cataloged" color="bg-blue-600" />
        <StatCard icon={TrendingUp} label="Total Citations" value={globalMetrics.totalCitations} sub={`Scopus: ${globalMetrics.scopusCitations} · WoS: ${globalMetrics.wosCitations}`} color="bg-indigo-600" />
        <StatCard icon={Award} label="Scopus h-index" value={globalMetrics.scopusHIndex} sub="Institutional" color="bg-orange-600" />
        <StatCard icon={Award} label="WoS h-index" value={globalMetrics.wosHIndex} sub="Institutional" color="bg-purple-600" />
        <StatCard icon={Users} label="Faculty Authors" value={stats.totalAuthors} sub={`Across ${stats.totalDepartments} departments`} color="bg-violet-600" />
      </div>

      {/* 2. Map of Science & General Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Share (Map of Science) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={16} className="text-blue-600" /> Map of Science (Departments)
              </h2>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                Top 5 + Others
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 mb-4 font-semibold">Publication share distribution by department</p>
          </div>
          {deptShare.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-xs italic">No department data yet</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedDeptShare}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={65}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {formattedDeptShare.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value} papers`,
                      item?.payload?.fullName || name
                    ]}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, fontWeight: 600, paddingTop: '6px' }}
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Year-wise Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-blue-600" /> Publications by Year
            </h2>
            <p className="text-[11px] text-gray-400 mt-1 mb-4 font-semibold">Annual publishing output trends</p>
          </div>
          {yearWise.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-xs italic">No annual data yet</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearWise}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f9fafb" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fontWeight: 500 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 500 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Indexing donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Star size={16} className="text-blue-600" /> Indexing Distribution
            </h2>
            <p className="text-[11px] text-gray-400 mt-1 mb-4 font-semibold">Journals database indexing status</p>
          </div>
          {indexingCounts.every(i => i.count === 0) ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-xs italic">No indexing records found</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={indexingCounts} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={40}>
                    {indexingCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 3. Leaders, Keywords, and Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Cited Researchers Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Star size={16} className="text-blue-600 fill-blue-600" /> Top Cited Researchers
          </h2>
          
          {leaderboard.length === 0 ? (
            <p className="text-gray-400 text-xs italic text-center py-6">No researcher records available.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {leaderboard.map((res, idx) => (
                <div key={res.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank */}
                    <span className="text-xs font-extrabold text-gray-400 w-4">{idx + 1}</span>
                    {/* Avatar */}
                    <FacultyAvatar name={res.fullName} photoUrl={res.photoUrl} size="md" />
                    {/* Info */}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-950 truncate hover:text-blue-700">
                        <Link href={`/authors/${res.id}`}>{res.fullName}</Link>
                      </h3>
                      <p className="text-[10px] text-gray-500 font-semibold truncate">
                        {res.designation} · {res.department}
                      </p>
                    </div>
                  </div>
                  {/* Citations / Publications summary count */}
                  <div className="text-right shrink-0 flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-xs font-bold text-gray-400">{res.publicationsCount}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase">Papers</div>
                    </div>
                    <div className="bg-indigo-50 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                      <div className="text-xs font-black text-indigo-700 leading-none">{res.citations}</div>
                      <div className="text-[8px] font-black text-indigo-500 uppercase tracking-wide mt-0.5">Citations</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Research Keywords Cloud */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Tags size={16} className="text-blue-600" /> Top Research Keywords
          </h2>
          
          {topKeywords.length === 0 ? (
            <p className="text-gray-400 text-xs italic text-center py-6">No keyword records available.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {topKeywords.map((kw, idx) => {
                // Determine a dynamic weight styling based on keyword count ranking
                let badgeClass = "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                if (idx < 3) {
                  badgeClass = "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-sm"
                } else if (idx < 6) {
                  badgeClass = "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                }

                return (
                  <span
                    key={kw.text}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-default ${badgeClass}`}
                    title={`${kw.count} publications`}
                  >
                    {kw.text} <span className="text-[10px] opacity-75">({kw.count})</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Publication types + Recent uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Publication type list */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
            Publication Types
          </h2>
          <div className="space-y-2">
            {typeCounts.length === 0 ? (
              <p className="text-gray-400 text-xs italic">No publication types classified yet.</p>
            ) : (
              typeCounts.map(({ type, count }) => (
                <div key={type} className="flex items-center justify-between text-xs md:text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 font-semibold">{getPublicationTypeLabel(type)}</span>
                  <span className="font-extrabold text-gray-900 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent publications catalog */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Recent Uploads
              </h2>
              <Link href="/publications" className="text-xs text-blue-600 hover:underline font-bold flex items-center">
                All Publications <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentPublications.length === 0 ? (
                <p className="text-gray-400 text-xs italic">No publications uploaded yet.</p>
              ) : (
                recentPublications.map(pub => (
                  <div key={pub.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <Link href={`/publications/${pub.id}`} className="text-sm font-bold text-gray-900 hover:text-blue-700 line-clamp-1 leading-snug">
                      {pub.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400 font-medium">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                        {pub.year}
                      </span>
                      {pub.journal && (
                        <span className="italic truncate max-w-[200px]">{truncate(pub.journal.title, 40)}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        pub.verificationStatus === 'VERIFIED' ? 'bg-green-50 text-green-700 border-green-100' :
                        pub.verificationStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-gray-50 text-gray-500 border-gray-100'
                      }`}>{pub.verificationStatus}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
