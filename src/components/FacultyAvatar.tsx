'use client'

import React, { useState } from 'react'

interface FacultyAvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-teal-600 to-emerald-700',
  'from-indigo-600 to-purple-700',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-pink-700',
  'from-cyan-600 to-blue-700',
]

function getGradient(name: string) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

export function normalizePhotoUrl(url?: string | null): string | null {
  if (!url) return null
  const str = url.trim()
  if (!str) return null
  
  const match = str.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w400'
  }
  return str
}

export function getCleanAuthorName(name: string): string {
  if (!name) return ''
  return name
    .replace(/^(?:prof(?:essor)?\.?|dr\.?|mr\.?|mrs\.?|ms\.?|smt\.?|shri\.?)\s+/gi, '')
    .replace(/^(?:prof(?:essor)?\.?|dr\.?)\s+/gi, '')
    .trim()
}

export function getFacultyInitial(name: string): string {
  const clean = getCleanAuthorName(name)
  if (!clean) return name ? name.trim().charAt(0).toUpperCase() : 'F'
  return clean.charAt(0).toUpperCase()
}

export default function FacultyAvatar({ name, photoUrl, size = 'md', className = '' }: FacultyAvatarProps) {
  const [imgError, setImgError] = useState(false)
  
  const cleanName = getCleanAuthorName(name)
  const initial = getFacultyInitial(name)
  const gradient = getGradient(cleanName || name || 'Faculty')
  const cleanUrl = normalizePhotoUrl(photoUrl)

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-xs font-bold',
    md: 'w-10 h-10 rounded-xl text-sm font-bold',
    lg: 'w-12 h-12 rounded-xl text-base font-bold',
    xl: 'w-32 h-32 md:w-36 md:h-36 rounded-2xl text-4xl md:text-5xl font-extrabold border-4 border-white shadow-md'
  }

  const selectedSize = sizeClasses[size] || sizeClasses.md

  if (cleanUrl && !imgError) {
    return (
      <div className={`relative shrink-0 overflow-hidden ${selectedSize} ${className} bg-slate-100 shadow-sm`}>
        <img
          src={cleanUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`shrink-0 flex items-center justify-center text-white bg-gradient-to-br ${gradient} shadow-sm ${selectedSize} ${className}`}>
      {initial}
    </div>
  )
}
