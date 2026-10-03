'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react'

type Source = 'SCOPUS' | 'WOS' | 'PUBMED' | 'CSV'

export default function ImportPage() {
  const [source, setSource] = useState<Source>('SCOPUS')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('source', source)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  const sourceInfo: Record<Source, { label: string; desc: string; hint: string }> = {
    SCOPUS: { label: 'Scopus', desc: 'Export from Scopus as CSV', hint: 'Export: Search results → CSV → All fields' },
    WOS: { label: 'Web of Science', desc: 'Export from WoS as plain text or CSV', hint: 'Export: Full Record → Tab-delimited (Win)' },
    PUBMED: { label: 'PubMed', desc: 'Export from PubMed as CSV', hint: 'Send to: File → Format: CSV' },
    CSV: { label: 'Custom CSV', desc: 'Any CSV with standard fields', hint: 'Required: Title, Year, DOI (recommended)' },
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Publications</h1>
        <p className="text-gray-500 text-sm mt-1">Upload exported files from Scopus, Web of Science, PubMed, or a custom CSV.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6">
        {/* Source selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Data source</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(sourceInfo) as Source[]).map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                  source === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{sourceInfo[s].label}</div>
                <div className="text-xs mt-0.5 opacity-70">{sourceInfo[s].desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <span>💡</span> {sourceInfo[source].hint}
          </p>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Upload file</label>
          <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            file ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }`}>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="text-center">
                <FileText size={32} className="mx-auto text-blue-600 mb-2" />
                <p className="text-sm font-medium text-blue-700">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-0.5">CSV or TXT files only</p>
              </div>
            )}
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
              <CheckCircle size={18} />
              Import completed
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                { label: 'Rows processed', value: result.rowsIn },
                { label: 'Inserted', value: result.rowsInserted },
                { label: 'Updated', value: result.rowsUpdated },
                { label: 'Duplicates', value: result.duplicatesFlagged },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg p-3 text-center border border-green-100">
                  <div className="text-2xl font-bold text-gray-800">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {result.errors > 0 && (
              <p className="mt-3 text-xs text-red-600">{result.errors} rows had errors and were skipped.</p>
            )}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {importing ? (
            <><Clock size={16} className="animate-spin" /> Importing…</>
          ) : (
            <><Upload size={16} /> Import publications</>
          )}
        </button>
      </div>

      {/* Field mapping guide */}
      <div className="mt-6 bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">CSV field reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-600">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-4">Field</th>
                <th className="pb-2 pr-4">Scopus</th>
                <th className="pb-2 pr-4">WoS</th>
                <th className="pb-2">PubMed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ['Title', 'Title', 'TI', 'Title'],
                ['DOI', 'DOI', 'DI', 'DOI'],
                ['Year', 'Year', 'PY', 'Publication Year'],
                ['Authors', 'Authors', 'AU', 'Authors'],
                ['Journal', 'Source title', 'SO', 'Journal/Book'],
                ['ISSN', 'ISSN', 'SN', 'ISSN'],
                ['Keywords', 'Author Keywords', 'DE', 'MeSH Terms'],
                ['Citations', 'Cited by', 'TC', 'Times Cited'],
              ].map(([field, scopus, wos, pubmed]) => (
                <tr key={field}>
                  <td className="py-1.5 pr-4 font-medium text-gray-700">{field}</td>
                  <td className="py-1.5 pr-4 font-mono text-blue-700">{scopus}</td>
                  <td className="py-1.5 pr-4 font-mono text-purple-700">{wos}</td>
                  <td className="py-1.5 font-mono text-green-700">{pubmed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
