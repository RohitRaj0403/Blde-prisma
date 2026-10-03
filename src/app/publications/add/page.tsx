'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'

const PUB_TYPES = [
  'ARTICLE', 'REVIEW', 'CASE_REPORT', 'META_ANALYSIS',
  'SYSTEMATIC_REVIEW', 'BOOK_CHAPTER', 'LETTER', 'EDITORIAL',
  'CONFERENCE_PAPER', 'OTHER',
]

interface Author {
  fullName: string
  authorOrder: number
  isCorresponding: boolean
  internalAuthor: boolean
  departmentId: string
}

export default function AddPublicationPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [keywordsInput, setKeywordsInput] = useState('')

  const [form, setForm] = useState({
    title: '', year: new Date().getFullYear(), publicationType: 'ARTICLE',
    doi: '', pmid: '', abstract: '', journalTitle: '', journalIssn: '',
    volume: '', issue: '', pages: '', url: '',
    indexedScopus: false, indexedWos: false, indexedPubmed: false,
    indexedDoaj: false, indexedUgcCare: false,
  })

  const [authors, setAuthors] = useState<Author[]>([
    { fullName: '', authorOrder: 1, isCorresponding: true, internalAuthor: true, departmentId: '' },
  ])

  function setField(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addAuthor() {
    setAuthors(prev => [...prev, {
      fullName: '', authorOrder: prev.length + 1,
      isCorresponding: false, internalAuthor: true, departmentId: '',
    }])
  }

  function removeAuthor(i: number) {
    setAuthors(prev => prev.filter((_, idx) => idx !== i).map((a, idx) => ({ ...a, authorOrder: idx + 1 })))
  }

  function updateAuthor(i: number, key: string, value: any) {
    setAuthors(prev => prev.map((a, idx) => idx === i ? { ...a, [key]: value } : a))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const keywords = keywordsInput.split(/[;,]/).map(k => k.trim()).filter(Boolean)

    try {
      const res = await fetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, authors, keywords }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setError(`Duplicate: A publication with this DOI already exists (ID: ${data.existingId})`)
        } else {
          setError(data.error ?? 'Failed to save')
        }
        return
      }

      router.push(`/publications/${data.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/publications" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={14} /> Back to Publications
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Publication</h1>
        <p className="text-gray-500 text-sm mt-1">Manually enter a publication record.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Publication details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => setField('title', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full publication title" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year <span className="text-red-500">*</span></label>
                <select value={form.year} onChange={e => setField('year', parseInt(e.target.value))} required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.publicationType} onChange={e => setField('publicationType', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PUB_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DOI</label>
                <input value={form.doi} onChange={e => setField('doi', e.target.value)}
                  placeholder="10.1234/abc.2023"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PMID</label>
                <input value={form.pmid} onChange={e => setField('pmid', e.target.value)}
                  placeholder="PubMed ID"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
              <textarea value={form.abstract} onChange={e => setField('abstract', e.target.value)} rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Paste abstract text here…" />
            </div>
          </div>
        </div>

        {/* Journal */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Journal / Source</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Journal name</label>
              <input value={form.journalTitle} onChange={e => setField('journalTitle', e.target.value)}
                placeholder="e.g. Indian Journal of Medical Research"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISSN</label>
              <input value={form.journalIssn} onChange={e => setField('journalIssn', e.target.value)}
                placeholder="0000-0000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input value={form.url} onChange={e => setField('url', e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
              <input value={form.volume} onChange={e => setField('volume', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue</label>
              <input value={form.issue} onChange={e => setField('issue', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
              <input value={form.pages} onChange={e => setField('pages', e.target.value)}
                placeholder="e.g. 123-130"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Authors */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Authors</h2>
            <button type="button" onClick={addAuthor}
              className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 font-medium">
              <Plus size={14} /> Add author
            </button>
          </div>
          <div className="space-y-3">
            {authors.map((author, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0 mt-1">
                  {i + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <input value={author.fullName} onChange={e => updateAuthor(i, 'fullName', e.target.value)}
                      placeholder="Full name (e.g. Dr. Anil Kumar S)"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={author.isCorresponding}
                        onChange={e => updateAuthor(i, 'isCorresponding', e.target.checked)}
                        className="text-blue-600 rounded" />
                      Corresponding
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={author.internalAuthor}
                        onChange={e => updateAuthor(i, 'internalAuthor', e.target.checked)}
                        className="text-blue-600 rounded" />
                      Internal
                    </label>
                  </div>
                </div>
                {authors.length > 1 && (
                  <button type="button" onClick={() => removeAuthor(i)} className="text-gray-400 hover:text-red-500 mt-1 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Indexing */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Indexing</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'indexedScopus', label: 'Scopus' },
              { key: 'indexedWos', label: 'Web of Science' },
              { key: 'indexedPubmed', label: 'PubMed' },
              { key: 'indexedDoaj', label: 'DOAJ' },
              { key: 'indexedUgcCare', label: 'UGC-CARE' },
            ].map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                (form as any)[key] ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}>
                <input type="checkbox" checked={(form as any)[key]}
                  onChange={e => setField(key, e.target.checked)}
                  className="text-blue-600 rounded" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Keywords</h2>
          <p className="text-xs text-gray-400 mb-3">Separate with commas or semicolons</p>
          <input value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)}
            placeholder="Diabetes, Hypertension, Karnataka; Metabolic Syndrome"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {keywordsInput && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {keywordsInput.split(/[;,]/).map(k => k.trim()).filter(Boolean).map(kw => (
                <span key={kw} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{kw}</span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pb-8">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors">
            <Save size={15} /> {saving ? 'Saving…' : 'Save publication'}
          </button>
          <Link href="/publications" className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
