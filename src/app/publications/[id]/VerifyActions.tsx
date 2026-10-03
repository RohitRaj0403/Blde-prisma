'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

export default function VerifyActions({
  publicationId,
  currentStatus,
}: {
  publicationId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [pendingAction, setPendingAction] = useState<'VERIFIED' | 'REJECTED' | null>(null)

  async function handleVerify(status: 'VERIFIED' | 'REJECTED' | 'PENDING') {
    if ((status === 'REJECTED') && !showNotes) {
      setPendingAction(status)
      setShowNotes(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/publications/${publicationId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes || undefined }),
      })
      if (res.ok) {
        setShowNotes(false)
        setNotes('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
      <p className="text-xs font-medium text-gray-500 mb-2">Verification actions</p>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleVerify('VERIFIED')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <CheckCircle size={13} /> Verify
        </button>
        <button
          onClick={() => handleVerify('REJECTED')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <XCircle size={13} /> Reject
        </button>
        {currentStatus !== 'PENDING' && (
          <button
            onClick={() => handleVerify('PENDING')}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Clock size={13} /> Mark pending
          </button>
        )}
      </div>

      {showNotes && (
        <div className="mt-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reason for rejection (optional)…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => pendingAction && handleVerify(pendingAction)}
              disabled={loading}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg"
            >
              Confirm rejection
            </button>
            <button onClick={() => { setShowNotes(false); setNotes('') }}
              className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
