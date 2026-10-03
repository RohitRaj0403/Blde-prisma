'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Sparkles, Image as ImageIcon } from 'lucide-react'
import FacultyAvatar from '@/components/FacultyAvatar'

interface AuthorData {
  id: string
  fullName: string
  orcid: string
  scopusAuthorId: string
  googleScholarId: string
  vidwanId: string
  researcherId: string
  designation: string
  school: string
  bio: string
  education: string
  experience: string
  expertise: string[]
  photoUrl: string
}

export default function EditProfileClient({ author }: { author: AuthorData }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [form, setForm] = useState({
    fullName: author.fullName,
    orcid: author.orcid || '',
    scopusAuthorId: author.scopusAuthorId || '',
    googleScholarId: author.googleScholarId || '',
    vidwanId: author.vidwanId || '',
    researcherId: author.researcherId || '',
    designation: author.designation || '',
    school: author.school || '',
    bio: author.bio || '',
    education: author.education || '',
    experience: author.experience || '',
    photoUrl: author.photoUrl || '',
  })

  const [expertiseInput, setExpertiseInput] = useState(author.expertise.join(', '))

  function setField(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const expertise = expertiseInput
      .split(/[;,]/)
      .map(t => t.trim())
      .filter(Boolean)

    try {
      const res = await fetch(`/api/authors/${author.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expertise }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to update profile')
      }

      router.refresh()
      router.push(`/authors/${author.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <Link href={`/authors/${author.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Profile
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Faculty Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Update your academic CV details, search IDs, expertise tags, and profile photo.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Core Profile & Photo */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Sparkles size={16} className="text-blue-600" /> Basic Details & Photo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Left side: Photo Preview */}
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2">
              <span className="text-xs font-semibold text-gray-500">Photo Preview</span>
              <FacultyAvatar name={form.fullName || 'Faculty'} photoUrl={form.photoUrl} size="xl" className="!w-28 !h-28 !text-2xl" />
            </div>

            {/* Right side: Inputs */}
            <div className="md:col-span-3 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setField('fullName', e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g. Dr. Anil Kumar S"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => setField('designation', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="e.g. Professor & Head"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School / College</label>
                  <input
                    type="text"
                    value={form.school}
                    onChange={e => setField('school', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="e.g. BLDE Medical College"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image URL</label>
                <input
                  type="url"
                  value={form.photoUrl}
                  onChange={e => setField('photoUrl', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono text-xs"
                  placeholder="https://images.unsplash.com/photo-..."
                />
                <span className="text-[11px] text-gray-400 mt-1 block">Paste an image URL (Unsplash, imgur, or your institution storage link) to display a photo.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Identifiers */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Academic & Research Identities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Vidwan ID</label>
              <input
                type="text"
                value={form.vidwanId}
                onChange={e => setField('vidwanId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="e.g. 394851"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ORCID iD</label>
              <input
                type="text"
                value={form.orcid}
                onChange={e => setField('orcid', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="0000-0002-1825-0097"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Scopus Author ID</label>
              <input
                type="text"
                value={form.scopusAuthorId}
                onChange={e => setField('scopusAuthorId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="57195432100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ResearcherID (WoS)</label>
              <input
                type="text"
                value={form.researcherId}
                onChange={e => setField('researcherId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="e.g. H-8274-2018"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Google Scholar ID</label>
              <input
                type="text"
                value={form.googleScholarId}
                onChange={e => setField('googleScholarId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="fo42anktZ9vv"
              />
            </div>
          </div>
        </div>

        {/* CV details */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800 mb-2 border-b border-gray-100 pb-2">Academic CV Sections</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
            <textarea
              value={form.bio}
              onChange={e => setField('bio', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              placeholder="Tell us about your research focus, awards, background..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Education & Qualifications</label>
            <textarea
              value={form.education}
              onChange={e => setField('education', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              placeholder="e.g. &#10;• Ph.D. in Medicine, Bangalore Medical College, 2012&#10;• MD in General Medicine, KIMS Hubli, 2008"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professional Experience</label>
            <textarea
              value={form.experience}
              onChange={e => setField('experience', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              placeholder="e.g. &#10;• Professor & Head, Department of Medicine, BLDE DU (2020 - Present)&#10;• Associate Professor, BLDE DU (2015 - 2020)"
            />
          </div>
        </div>

        {/* Expertise tags */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-1 border-b border-gray-100 pb-2">Areas of Research / Expertise</h2>
          <p className="text-[11px] text-gray-400 mb-3">Separate each research keyword with a comma or semicolon</p>
          <input
            type="text"
            value={expertiseInput}
            onChange={e => setExpertiseInput(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Cardiology, Diabetes, Endocrinology, Biomarkers"
          />
          {expertiseInput && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {expertiseInput.split(/[;,]/).map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold border border-blue-100">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit / Cancel */}
        <div className="flex items-center gap-3 pt-2 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
          >
            <Save size={15} /> {saving ? 'Saving Changes…' : 'Save Profile'}
          </button>
          <Link
            href={`/authors/${author.id}`}
            className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
