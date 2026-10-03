import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatYear(year: number) {
  return year.toString()
}

export function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function getIndexingLabel(key: string) {
  const map: Record<string, string> = {
    indexedScopus: 'Scopus',
    indexedWos: 'WoS',
    indexedPubmed: 'PubMed',
    indexedDoaj: 'DOAJ',
    indexedUgcCare: 'UGC-CARE',
    indexedGoogleScholar: 'Google Scholar',
  }
  return map[key] ?? key
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    IMPORTED: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    VERIFIED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

export function getPublicationTypeLabel(type: string) {
  const map: Record<string, string> = {
    ARTICLE: 'Article',
    REVIEW: 'Review',
    CASE_REPORT: 'Case Report',
    META_ANALYSIS: 'Meta-Analysis',
    SYSTEMATIC_REVIEW: 'Systematic Review',
    BOOK_CHAPTER: 'Book Chapter',
    LETTER: 'Letter',
    EDITORIAL: 'Editorial',
    CONFERENCE_PAPER: 'Conference Paper',
    OTHER: 'Other',
  }
  return map[type] ?? type
}

export function ordinalAuthorPosition(n: number) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}
