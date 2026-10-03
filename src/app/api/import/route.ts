import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

const SCOPUS_MAP: Record<string, string> = {
  'Title': 'title', 'Authors': 'authors', 'Year': 'year',
  'Source title': 'journal', 'DOI': 'doi', 'ISSN': 'issn',
  'Author Keywords': 'keywords', 'Cited by': 'citations',
  'Abstract': 'abstract', 'Document Type': 'type',
  'Correspondence Address': 'affiliation', 'EID': 'scopusEid',
}

const WOS_MAP: Record<string, string> = {
  'TI': 'title', 'AU': 'authors', 'PY': 'year',
  'SO': 'journal', 'DI': 'doi', 'SN': 'issn',
  'DE': 'keywords', 'TC': 'citations', 'AB': 'abstract',
  'DT': 'type', 'UT': 'wosUid',
}

const PUBMED_MAP: Record<string, string> = {
  'Title': 'title', 'Authors': 'authors', 'Publication Year': 'year',
  'Journal/Book': 'journal', 'DOI': 'doi', 'ISSN': 'issn',
  'MeSH Terms': 'keywords', 'Times Cited': 'citations', 'Abstract': 'abstract',
  'PMID': 'pmid',
}

function getFieldMap(source: string) {
  if (source === 'SCOPUS') return SCOPUS_MAP
  if (source === 'WOS') return WOS_MAP
  if (source === 'PUBMED') return PUBMED_MAP
  return {} // CSV: use as-is
}

function normaliseType(raw: string): string {
  const r = (raw ?? '').toLowerCase()
  if (r.includes('review')) return 'REVIEW'
  if (r.includes('case')) return 'CASE_REPORT'
  if (r.includes('letter')) return 'LETTER'
  if (r.includes('editorial')) return 'EDITORIAL'
  if (r.includes('book') || r.includes('chapter')) return 'BOOK_CHAPTER'
  if (r.includes('conference') || r.includes('proceedings')) return 'CONFERENCE_PAPER'
  return 'ARTICLE'
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const user = session.user as any
  if (!['ADMIN', 'VERIFIER'].includes(user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const source = (formData.get('source') as string) ?? 'CSV'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const { data: rows, errors } = Papa.parse(text, { header: true, skipEmptyLines: true })

  if (errors.length > 0) {
    return NextResponse.json({ error: `CSV parse error: ${errors[0].message}` }, { status: 400 })
  }

  const fieldMap = getFieldMap(source)

  // Create import job
  const job = await prisma.importJob.create({
    data: {
      source: source as any,
      fileName: file.name,
      rowsIn: rows.length,
      status: 'RUNNING',
    },
  })

  let inserted = 0, updated = 0, duplicates = 0, errs = 0
  const jobLog: any[] = []

  for (const rawRow of rows as any[]) {
    try {
      // Map fields
      const row: any = {}
      for (const [csvKey, normKey] of Object.entries(fieldMap)) {
        if (rawRow[csvKey] !== undefined) row[normKey] = rawRow[csvKey]
      }
      // For custom CSV, use as-is
      if (source === 'CSV') Object.assign(row, rawRow)

      const title = (row.title ?? '').trim()
      const year = parseInt(row.year ?? '0')
      const doi = (row.doi ?? '').trim() || null

      if (!title || !year) { errs++; continue }

      // Dedup check
      const existing = doi
        ? await prisma.publication.findUnique({ where: { doi } })
        : await prisma.publication.findFirst({
            where: { title: { equals: title, mode: 'insensitive' }, year },
          })

      // Upsert journal
      let journalId: string | null = null
      if (row.journal) {
        const journal = await prisma.journal.upsert({
          where: { id: 'noop' },
          update: {},
          create: { title: row.journal.trim(), issn: row.issn?.trim() },
        }).catch(async () => {
          const found = await prisma.journal.findFirst({ where: { title: { equals: row.journal.trim(), mode: 'insensitive' } } })
          return found
        })
        journalId = journal?.id ?? null
      }

      const pubData = {
        title,
        year,
        doi,
        pmid: row.pmid?.trim() || null,
        wosUid: row.wosUid?.trim() || null,
        scopusEid: row.scopusEid?.trim() || null,
        abstract: row.abstract?.trim() || null,
        publicationType: normaliseType(row.type ?? '') as any,
        source: source as any,
        journalId,
        importJobId: job.id,
        verificationStatus: 'IMPORTED' as any,
      }

      if (existing) {
        duplicates++
        await prisma.publication.update({ where: { id: existing.id }, data: { ...pubData, verificationStatus: existing.verificationStatus } })
        updated++
      } else {
        const pub = await prisma.publication.create({ data: pubData })

        // Indexing defaults based on source
        await prisma.publicationIndexing.create({
          data: {
            publicationId: pub.id,
            indexedScopus: source === 'SCOPUS',
            indexedWos: source === 'WOS',
            indexedPubmed: source === 'PUBMED',
          },
        })

        // Keywords
        if (row.keywords) {
          const kws = row.keywords.split(/[;|]/).map((k: string) => k.trim()).filter(Boolean)
          for (const kw of kws) {
            const keyword = await prisma.keyword.upsert({
              where: { keywordText: kw },
              update: {},
              create: { keywordText: kw },
            })
            await prisma.publicationKeyword.upsert({
              where: { publicationId_keywordId: { publicationId: pub.id, keywordId: keyword.id } },
              update: {},
              create: { publicationId: pub.id, keywordId: keyword.id, keywordType: source === 'PUBMED' ? 'MESH' : 'AUTHOR' },
            })
          }
        }

        // Citation snapshot
        const citCount = parseInt(row.citations ?? '0')
        if (citCount > 0) {
          await prisma.citationSnapshot.create({
            data: {
              publicationId: pub.id,
              citationsScopus: source === 'SCOPUS' ? citCount : null,
              citationsWos: source === 'WOS' ? citCount : null,
              citationsPubmed: source === 'PUBMED' ? citCount : null,
            },
          })
        }

        inserted++
      }
    } catch (e: any) {
      errs++
      jobLog.push({ error: e.message, row: rawRow })
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      finishedOn: new Date(),
      rowsInserted: inserted,
      rowsUpdated: updated,
      duplicatesFlagged: duplicates,
      errorsCount: errs,
      jobLog,
      status: 'COMPLETED',
    },
  })

  return NextResponse.json({
    jobId: job.id,
    rowsIn: rows.length,
    rowsInserted: inserted,
    rowsUpdated: updated,
    duplicatesFlagged: duplicates,
    errors: errs,
  })
}
