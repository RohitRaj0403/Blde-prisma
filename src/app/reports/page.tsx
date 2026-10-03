'use client'

import { useState } from 'react'
import { Download, BarChart3 } from 'lucide-react'

const templates = [
  { id: 'year-indexing', label: 'Publications Year-wise with Indexing', desc: 'Year-by-year breakdown with Scopus/WoS/PubMed/UGC-CARE columns' },
  { id: 'dept-scopus', label: 'Department-wise Scopus/WoS Count', desc: 'Each department\'s Scopus and WoS-indexed publication count' },
  { id: 'author-wise', label: 'Author-wise Publications', desc: 'Per-author list with authorship order and citation count' },
  { id: 'ugc-care', label: 'UGC-CARE Compliance Report', desc: 'All publications in UGC-CARE listed journals' },
  { id: 'citation-summary', label: 'Citation Summary (Scopus vs WoS)', desc: 'Total and average citations by source' },
]

export default function ReportsPage() {
  const [framework, setFramework] = useState('NAAC')
  const [unit, setUnit] = useState('INSTITUTION')
  const [fromYear, setFromYear] = useState('2020')
  const [toYear, setToYear] = useState(new Date().getFullYear().toString())
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(['year-indexing'])
  const [loading, setLoading] = useState(false)

  function toggleTemplate(id: string) {
    setSelectedTemplates(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  async function handleExport(format: 'excel' | 'pdf') {
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework, unit, fromYear: parseInt(fromYear), toYear: parseInt(toYear), templates: selectedTemplates, format }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate report' }))
        alert(`Error: ${err.error || 'Failed to generate report'}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BLDE-PRISM-${framework}-${fromYear}-${toYear}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(`Export error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const years = Array.from({ length: 15 }, (_, i) => (new Date().getFullYear() - i).toString())

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports Builder</h1>
        <p className="text-gray-500 text-sm mt-1">Generate NAAC, NIRF, or UGC-ready reports.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6">
        {/* Framework */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Framework</label>
          <div className="flex gap-2">
            {['NAAC', 'NIRF', 'UGC', 'Custom'].map(f => (
              <button key={f} onClick={() => setFramework(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${framework === f ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Report unit</label>
          <div className="flex gap-2">
            {['INSTITUTION', 'DEPARTMENT', 'AUTHOR'].map(u => (
              <button key={u} onClick={() => setUnit(u)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${unit === u ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {u.charAt(0) + u.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Period */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Period</label>
          <div className="flex items-center gap-3">
            <select value={fromYear} onChange={e => setFromYear(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-gray-400 text-sm">to</span>
            <select value={toYear} onChange={e => setToYear(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Templates */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Include tables</label>
          <div className="space-y-2">
            {templates.map(t => (
              <label key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={selectedTemplates.includes(t.id)} onChange={() => toggleTemplate(t.id)}
                  className="mt-0.5 text-blue-600 rounded" />
                <div>
                  <div className="text-sm font-medium text-gray-800">{t.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => handleExport('excel')} disabled={loading || selectedTemplates.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            <Download size={16} /> Export Excel
          </button>
          <button onClick={() => handleExport('pdf')} disabled={loading || selectedTemplates.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
