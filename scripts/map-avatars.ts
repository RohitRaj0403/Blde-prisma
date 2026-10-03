import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()
const avatarsDir = path.join(process.cwd(), 'public', 'avatars')

function extractFileId(url: string | null): string | null {
  if (!url) return null
  const match = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

async function main() {
  const excelPath = path.join(process.cwd(), 'prisma/faculty_publications_dataset.xlsx')
  const wb = XLSX.readFile(excelPath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet)

  // Map vidwanId & name to google fileId from Excel
  const facultyExcelMap = new Map<string, { name: string; vidwanId: string; fileId: string; photoUrl: string }>()
  for (const row of rows) {
    const name = String(row['fullName'] || '').trim()
    const vidwanId = String(row['vidwanId'] || '').trim()
    const photoUrl = String(row['photoUrl'] || '').trim()
    const fileId = extractFileId(photoUrl)

    if (fileId) {
      if (vidwanId) {
        facultyExcelMap.set(`vidwan:${vidwanId}`, { name, vidwanId, fileId, photoUrl })
      }
      if (name) {
        facultyExcelMap.set(`name:${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`, { name, vidwanId, fileId, photoUrl })
      }
    }
  }

  console.log(`Excel mapped faculty with drive images: ${facultyExcelMap.size}`)

  // Get current DB authors
  const authors = await prisma.author.findMany({
    select: { id: true, fullName: true, vidwanId: true, photoUrl: true, userId: true }
  })

  console.log(`Authors in DB: ${authors.length}`)

  let mappedCount = 0
  for (const author of authors) {
    const currentFile = path.join(avatarsDir, `${author.id}.jpg`)
    if (fs.existsSync(currentFile) && fs.statSync(currentFile).size > 500) {
      // It exists as author.id.jpg
      // Let's also create vidwan_<vidwanId>.jpg and fileId.jpg copies if known
      if (author.vidwanId) {
        const vidwanFile = path.join(avatarsDir, `vidwan_${author.vidwanId}.jpg`)
        if (!fs.existsSync(vidwanFile)) {
          fs.copyFileSync(currentFile, vidwanFile)
        }
      }
      
      const cleanNameKey = author.fullName.toLowerCase().replace(/^(?:prof(?:essor)?\.?|dr\.?|mr\.?|mrs\.?|ms\.?|smt\.?|shri\.?)\s+/g, '').replace(/[^a-z0-9]/g, '')
      const fromExcel = (author.vidwanId && facultyExcelMap.get(`vidwan:${author.vidwanId}`)) || facultyExcelMap.get(`name:${cleanNameKey}`)
      if (fromExcel && fromExcel.fileId) {
        const fileIdPath = path.join(avatarsDir, `${fromExcel.fileId}.jpg`)
        if (!fs.existsSync(fileIdPath)) {
          fs.copyFileSync(currentFile, fileIdPath)
        }
      }

      // Ensure author and user records in DB have /avatars/<author.id>.jpg
      const localUrl = `/avatars/${author.id}.jpg`
      await prisma.author.update({
        where: { id: author.id },
        data: { photoUrl: localUrl }
      })
      if (author.userId) {
        await prisma.user.update({
          where: { id: author.userId },
          data: { image: localUrl }
        }).catch(() => {})
      }
      mappedCount++
    }
  }

  console.log(`✅ Successfully verified and mapped ${mappedCount} authors with local avatar files!`)
  const totalFiles = fs.readdirSync(avatarsDir).length
  console.log(`Total avatar files in public/avatars: ${totalFiles}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
