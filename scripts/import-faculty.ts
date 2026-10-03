import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars')

if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true })
}

function extractFileId(url: string | null): string | null {
  if (!url) return null
  const match = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const arrayBuf = await res.arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    if (buf.length > 500 && !buf.subarray(0, 10).toString().includes('<')) {
      return buf
    }
    return null
  } catch {
    return null
  }
}

async function downloadPhoto(author: { id: string; fullName: string; photoUrl: string | null }): Promise<string | null> {
  const fileId = extractFileId(author.photoUrl)
  if (!fileId) return null

  const targetFile = path.join(AVATARS_DIR, `${author.id}.jpg`)

  // Try Google usercontent direct endpoint first
  let buf = await fetchImageBuffer(`https://lh3.googleusercontent.com/d/${fileId}`)
  
  // Fallback to Drive thumbnail endpoint
  if (!buf) {
    buf = await fetchImageBuffer(`https://drive.google.com/thumbnail?id=${fileId}&sz=w400`)
  }

  if (buf) {
    fs.writeFileSync(targetFile, buf)
    return `/avatars/${author.id}.jpg`
  }

  return null
}

async function main() {
  console.log('🖼️ Fetching authors with photo URLs...')
  const authors = await prisma.author.findMany({
    where: { photoUrl: { not: null } },
    select: { id: true, fullName: true, photoUrl: true, userId: true },
  })

  console.log(`Found ${authors.length} authors to process. Downloading images to public/avatars/ ...`)

  let successCount = 0
  const concurrency = 8
  
  for (let i = 0; i < authors.length; i += concurrency) {
    const chunk = authors.slice(i, i + concurrency)
    await Promise.all(
      chunk.map(async (author) => {
        const localPath = await downloadPhoto(author)
        if (localPath) {
          await prisma.author.update({
            where: { id: author.id },
            data: { photoUrl: localPath },
          })
          if (author.userId) {
            await prisma.user.update({
              where: { id: author.userId },
              data: { image: localPath },
            }).catch(() => {})
          }
          successCount++
          console.log(`  ✅ [${successCount}/${authors.length}] Saved photo: ${author.fullName}`)
        } else {
          console.log(`  ⚠️ Could not download photo for: ${author.fullName} (will use styled monogram initial)`)
        }
      })
    )
  }

  console.log(`\n🎉 Completed! Successfully cached ${successCount} profile photos into ${AVATARS_DIR}`)
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


