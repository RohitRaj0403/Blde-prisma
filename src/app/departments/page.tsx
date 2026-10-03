import { prisma } from '@/lib/prisma'

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { authorships: true } },
    },
  })

  // Get publication count per department
  const pubCounts = await Promise.all(
    departments.map(async d => {
      const count = await prisma.publication.count({
        where: { authorships: { some: { departmentId: d.id } } },
      })
      const verified = await prisma.publication.count({
        where: { authorships: { some: { departmentId: d.id } }, verificationStatus: 'VERIFIED' },
      })
      const scopus = await prisma.publication.count({
        where: { authorships: { some: { departmentId: d.id } }, indexing: { indexedScopus: true } },
      })
      return { id: d.id, total: count, verified, scopus }
    })
  )

  const countsMap = Object.fromEntries(pubCounts.map(c => [c.id, c]))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-500 text-sm mt-0.5">{departments.length} departments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map(dept => {
          const counts = countsMap[dept.id] ?? { total: 0, verified: 0, scopus: 0 }
          const pct = counts.total > 0 ? Math.round(counts.verified / counts.total * 100) : 0

          return (
            <div key={dept.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{dept.name}</h2>
                  {dept.faculty && <p className="text-xs text-gray-400 mt-0.5">{dept.faculty}</p>}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-700">{counts.total}</div>
                  <div className="text-xs text-gray-400">publications</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-green-50 rounded-lg p-2">
                  <div className="font-bold text-green-700">{counts.verified}</div>
                  <div className="text-xs text-gray-500">Verified</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="font-bold text-blue-700">{counts.scopus}</div>
                  <div className="text-xs text-gray-500">Scopus</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="font-bold text-gray-700">{pct}%</div>
                  <div className="text-xs text-gray-500">Verified %</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
