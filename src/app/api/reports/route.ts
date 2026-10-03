import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { framework = 'NAAC', unit = 'INSTITUTION', fromYear = 2020, toYear = 2026, templates = [], format = 'excel' } = await req.json()

  const yearRange = { gte: Number(fromYear), lte: Number(toYear) }

  // ─── 1. Fetch Data for Selected Templates ──────────────────────────────────
  let yearIndexingRows: any[] = []
  if (templates.includes('year-indexing')) {
    const pubs = await prisma.publication.findMany({
      where: { year: yearRange },
      include: { indexing: true },
    })
    const years = Array.from(new Set(pubs.map(p => p.year))).sort((a, b) => a - b)
    yearIndexingRows = years.map(y => {
      const yearPubs = pubs.filter(p => p.year === y)
      return {
        Year: y,
        Total: yearPubs.length,
        Scopus: yearPubs.filter(p => p.indexing?.indexedScopus).length,
        WoS: yearPubs.filter(p => p.indexing?.indexedWos).length,
        PubMed: yearPubs.filter(p => p.indexing?.indexedPubmed).length,
        DOAJ: yearPubs.filter(p => p.indexing?.indexedDoaj).length,
        'UGC-CARE': yearPubs.filter(p => p.indexing?.indexedUgcCare).length,
      }
    })
  }

  let deptScopusRows: any[] = []
  if (templates.includes('dept-scopus')) {
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
    deptScopusRows = await Promise.all(departments.map(async d => {
      const base = { authorships: { some: { departmentId: d.id } }, year: yearRange }
      const [total, scopus, wos, pubmed, ugc] = await Promise.all([
        prisma.publication.count({ where: base }),
        prisma.publication.count({ where: { ...base, indexing: { indexedScopus: true } } }),
        prisma.publication.count({ where: { ...base, indexing: { indexedWos: true } } }),
        prisma.publication.count({ where: { ...base, indexing: { indexedPubmed: true } } }),
        prisma.publication.count({ where: { ...base, indexing: { indexedUgcCare: true } } }),
      ])
      return { Department: d.name, Total: total, Scopus: scopus, WoS: wos, PubMed: pubmed, 'UGC-CARE': ugc }
    }))
  }

  let authorWiseRows: any[] = []
  if (templates.includes('author-wise')) {
    const authorships = await prisma.authorship.findMany({
      where: { publication: { year: yearRange } },
      include: {
        author: true,
        publication: { include: { journal: true, citations: { orderBy: { capturedOn: 'desc' }, take: 1 } } },
        department: true,
      },
      orderBy: { publication: { year: 'desc' } },
      take: 1000,
    })
    authorWiseRows = authorships.map(a => ({
      Author: a.author.fullName,
      Department: a.department?.name ?? 'General',
      Title: a.publication.title,
      Year: a.publication.year,
      Journal: a.publication.journal?.title ?? '',
      'Author Order': a.authorOrder,
      'Corresponding': a.isCorresponding ? 'Yes' : 'No',
      'Citations (Scopus)': a.publication.citations[0]?.citationsScopus ?? 0,
    }))
  }

  let ugcCareRows: any[] = []
  if (templates.includes('ugc-care')) {
    const pubs = await prisma.publication.findMany({
      where: { year: yearRange, indexing: { indexedUgcCare: true } },
      include: { journal: true, authorships: { include: { author: true }, orderBy: { authorOrder: 'asc' }, take: 5 } },
      orderBy: { year: 'desc' },
      take: 500,
    })
    ugcCareRows = pubs.map(p => ({
      Title: p.title,
      Year: p.year,
      Journal: p.journal?.title ?? '',
      ISSN: p.journal?.issn ?? '',
      Authors: p.authorships.map(a => a.author.fullName).join('; '),
      DOI: p.doi ?? '',
    }))
  }

  let citationSummaryRows: any[] = []
  if (templates.includes('citation-summary')) {
    const snapshots = await prisma.citationSnapshot.findMany({
      include: { publication: { select: { year: true } } },
      where: { publication: { year: yearRange } },
    })
    const scopusTotal = snapshots.reduce((s, c) => s + (c.citationsScopus ?? 0), 0)
    const wosTotal = snapshots.reduce((s, c) => s + (c.citationsWos ?? 0), 0)
    citationSummaryRows = [
      { Source: 'Scopus', 'Total Citations': scopusTotal, 'Avg per pub': snapshots.length ? (scopusTotal / snapshots.length).toFixed(2) : '0' },
      { Source: 'WoS', 'Total Citations': wosTotal, 'Avg per pub': snapshots.length ? (wosTotal / snapshots.length).toFixed(2) : '0' },
    ]
  }

  // ─── 2. Branch: PDF Format Export ──────────────────────────────────────────
  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth() // 297mm
    const pageHeight = doc.internal.pageSize.getHeight() // 210mm

    // Draw Universal Header Banner
    const drawHeader = () => {
      doc.setFillColor(30, 58, 138) // Deep University Blue
      doc.rect(0, 0, pageWidth, 22, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('BLDE (Deemed to be University) - PRISM', 14, 9)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Publications, Research & Impact Scholarly Management System | Academic Evaluation Report', 14, 16)
      
      const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      doc.text(`Generated: ${genDate}`, pageWidth - 14, 16, { align: 'right' })
    }

    drawHeader()

    // Sub-header Meta Banner
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(14, 26, pageWidth - 28, 11, 2, 2, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`Framework: ${framework}`, 18, 33)
    doc.text(`Report Unit: ${unit}`, 80, 33)
    doc.text(`Period: ${fromYear} - ${toYear}`, 150, 33)
    doc.text(`Status: Official Institutional Record`, pageWidth - 18, 33, { align: 'right' })

    let currentY = 43

    // Section 1: Year-wise Indexing
    if (templates.includes('year-indexing') && yearIndexingRows.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 138)
      doc.text('1. Publications Year-wise with Indexing Breakdown', 14, currentY)
      currentY += 4

      autoTable(doc, {
        startY: currentY,
        head: [['Year', 'Total Publications', 'Scopus Indexed', 'Web of Science (WoS)', 'PubMed', 'DOAJ', 'UGC-CARE']],
        body: yearIndexingRows.map(r => [r.Year, r.Total, r.Scopus, r.WoS, r.PubMed, r.DOAJ, r['UGC-CARE']]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Section 2: Department-wise Scopus/WoS
    if (templates.includes('dept-scopus') && deptScopusRows.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage()
        drawHeader()
        currentY = 30
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 138)
      doc.text('2. Department-wise Scopus & Web of Science Research Output', 14, currentY)
      currentY += 4

      autoTable(doc, {
        startY: currentY,
        head: [['Department', 'Total Publications', 'Scopus Indexed', 'WoS Indexed', 'PubMed', 'UGC-CARE']],
        body: deptScopusRows.map(r => [r.Department, r.Total, r.Scopus, r.WoS, r.PubMed, r['UGC-CARE']]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Section 3: Citation Summary
    if (templates.includes('citation-summary') && citationSummaryRows.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage()
        drawHeader()
        currentY = 30
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 138)
      doc.text('3. Citation Impact Summary (Scopus vs WoS)', 14, currentY)
      currentY += 4

      autoTable(doc, {
        startY: currentY,
        head: [['Citation Source', 'Total Citations Recorded', 'Average Citations per Paper']],
        body: citationSummaryRows.map(r => [r.Source, r['Total Citations'], r['Avg per pub']]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Section 4: UGC-CARE
    if (templates.includes('ugc-care') && ugcCareRows.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage()
        drawHeader()
        currentY = 30
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 138)
      doc.text('4. UGC-CARE Listed Publications', 14, currentY)
      currentY += 4

      autoTable(doc, {
        startY: currentY,
        head: [['Title', 'Year', 'Journal', 'ISSN', 'Authors', 'DOI']],
        body: ugcCareRows.map(r => [r.Title, r.Year, r.Journal, r.ISSN, r.Authors, r.DOI]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 80 },
          2: { cellWidth: 50 },
          4: { cellWidth: 60 },
        }
      })
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Section 5: Author-wise
    if (templates.includes('author-wise') && authorWiseRows.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage()
        drawHeader()
        currentY = 30
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 138)
      doc.text('5. Author-wise Publication Records', 14, currentY)
      currentY += 4

      autoTable(doc, {
        startY: currentY,
        head: [['Author', 'Department', 'Publication Title', 'Year', 'Journal', 'Order', 'Corr.', 'Citations']],
        body: authorWiseRows.map(r => [r.Author, r.Department, r.Title, r.Year, r.Journal, r['Author Order'], r.Corresponding, r['Citations (Scopus)']]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 80 },
          4: { cellWidth: 50 },
        }
      })
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Add Page Numbers Footer
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text(
        `BLDE (Deemed to be University) - PRISM Academic Assessment Report | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      )
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="BLDE-PRISM-${framework}-${fromYear}-${toYear}.pdf"`,
      },
    })
  }

  // ─── 3. Branch: Excel Format Export ────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  if (templates.includes('year-indexing') && yearIndexingRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(yearIndexingRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Year-wise Indexing')
  }

  if (templates.includes('dept-scopus') && deptScopusRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(deptScopusRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Dept-wise Scopus')
  }

  if (templates.includes('author-wise') && authorWiseRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(authorWiseRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Author-wise')
  }

  if (templates.includes('ugc-care') && ugcCareRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(ugcCareRows)
    XLSX.utils.book_append_sheet(wb, ws, 'UGC-CARE')
  }

  if (templates.includes('citation-summary') && citationSummaryRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(citationSummaryRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Citation Summary')
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="BLDE-PRISM-${framework}-${fromYear}-${toYear}.xlsx"`,
    },
  })
}

