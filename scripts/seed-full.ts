import { PrismaClient, UserRole, PublicationType, ImportSource, VerificationStatus, AffiliationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const EXCEL_FILE = fs.existsSync(path.join(__dirname, '../prisma/faculty_publications_dataset.xlsx'))
  ? path.join(__dirname, '../prisma/faculty_publications_dataset.xlsx')
  : "C:\\Users\\AIO-01\\Downloads\\faculty_publications_formatted_with_images_issn_keywords_education.xlsx"

const prisma = new PrismaClient()

const AVATARS_DIR = path.join(__dirname, '../public/avatars')

function resolvePhotoUrl(url: any, vidwanId?: string): string | null {
  if (vidwanId && fs.existsSync(path.join(AVATARS_DIR, `vidwan_${vidwanId}.jpg`))) {
    return `/avatars/vidwan_${vidwanId}.jpg`
  }
  if (!url) return null
  const str = String(url).trim()
  if (!str) return null
  if (str.startsWith('/avatars/')) return str

  const match = str.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    const fileId = match[1]
    if (fs.existsSync(path.join(AVATARS_DIR, `${fileId}.jpg`))) {
      return `/avatars/${fileId}.jpg`
    }
    return `https://lh3.googleusercontent.com/d/${fileId}`
  }
  return str
}

function cleanStr(val: any): string {
  if (val === undefined || val === null) return ""
  const s = String(val).trim()
  if (["none", "nan", "null", "n/a", "na", "-"].includes(s.toLowerCase())) {
    return ""
  }
  return s
}

function mapPublicationType(typeStr: string): PublicationType {
  const s = typeStr.toLowerCase()
  if (s.includes("review") && s.includes("systematic")) return PublicationType.SYSTEMATIC_REVIEW
  if (s.includes("review")) return PublicationType.REVIEW
  if (s.includes("case")) return PublicationType.CASE_REPORT
  if (s.includes("meta")) return PublicationType.META_ANALYSIS
  if (s.includes("book") || s.includes("chapter")) return PublicationType.BOOK_CHAPTER
  if (s.includes("letter")) return PublicationType.LETTER
  if (s.includes("editorial")) return PublicationType.EDITORIAL
  if (s.includes("conference") || s.includes("proceeding")) return PublicationType.CONFERENCE_PAPER
  if (s.includes("other")) return PublicationType.OTHER
  return PublicationType.ARTICLE
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

function addDrPrefix(name: string): string {
  if (!name) return name
  const trimmed = name.trim()
  if (/^prof\.?\s+dr\.?/i.test(trimmed)) {
    return trimmed.replace(/^prof\.?\s+dr\.?\s*/i, 'Prof. Dr. ')
  }
  if (/^prof\.?\s+/i.test(trimmed)) {
    return trimmed.replace(/^prof\.?\s*/i, 'Prof. Dr. ')
  }
  if (/^dr\.?\s+/i.test(trimmed)) {
    return trimmed.replace(/^dr\.?\s+/i, 'Dr. ')
  }
  return `Dr. ${trimmed}`
}

async function cleanDummyData() {
  console.log('🧹 [PHASE 1] Purging dummy / mock data from database...')

  // Delete dependent publication tables first
  console.log('  • Deleting old verifications, audit logs, citations, and indexing...')
  await prisma.publicationVerification.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.citationSnapshot.deleteMany({})
  await prisma.publicationKeyword.deleteMany({})
  await prisma.publicationIndexing.deleteMany({})
  await prisma.authorship.deleteMany({})
  await prisma.publication.deleteMany({})
  await prisma.keyword.deleteMany({})
  await prisma.journal.deleteMany({})
  await prisma.publisher.deleteMany({})

  // Delete authors
  console.log('  • Deleting old author profiles...')
  await prisma.author.deleteMany({})

  // Delete non-admin users (preserve admin)
  console.log('  • Deleting old mock faculty/verifier users...')
  await prisma.session.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.user.deleteMany({
    where: {
      role: { not: UserRole.ADMIN }
    }
  })

  // Delete old departments
  console.log('  • Resetting departments...')
  await prisma.department.deleteMany({})

  // Ensure Admin exists
  const adminPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@blde.ac.in' },
    update: {
      name: 'Admin',
      role: UserRole.ADMIN,
      password: adminPassword,
    },
    create: {
      email: 'admin@blde.ac.in',
      name: 'Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  // Ensure Verifier exists
  const verifierPassword = await bcrypt.hash('faculty123', 12)
  await prisma.user.upsert({
    where: { email: 'verifier@blde.ac.in' },
    update: {
      name: 'Library Coordinator',
      role: UserRole.VERIFIER,
      password: verifierPassword,
    },
    create: {
      email: 'verifier@blde.ac.in',
      name: 'Library Coordinator',
      password: verifierPassword,
      role: UserRole.VERIFIER,
    },
  })

  // Ensure Internal Affiliation exists
  await prisma.affiliation.deleteMany({})
  await prisma.affiliation.create({
    data: {
      institutionName: 'BLDE (Deemed to be University)',
      type: AffiliationType.INTERNAL,
      mappingRule: 'BLDE|Bijapur Liberal District Education|Shri B. M. Patil Medical College',
    },
  })

  console.log('✅ [PHASE 1 COMPLETE] Database is clean and ready for real data import.\n')
}

async function importRealData() {
  console.log(`📥 [PHASE 2] Loading Excel dataset: ${EXCEL_FILE}`)
  
  if (!fs.existsSync(EXCEL_FILE)) {
    throw new Error(`Excel file not found at ${EXCEL_FILE}`)
  }

  const workbook = XLSX.readFile(EXCEL_FILE)
  const sheetName = workbook.SheetNames[0]
  const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" })

  console.log(`📊 Found ${rawRows.length} total publication rows in Excel sheet.`)

  // Step 1: Collect unique departments & faculty
  const facultyMap = new Map<string, {
    fullName: string
    email: string
    departmentName: string
    vidwanId: string
    orcid: string
    scopusAuthorId: string
    researcherId: string
    googleScholarId: string
    bio: string
    photoUrl: string | null
    education: string
    experience: string
    expertise: string[]
  }>()

  const departmentSet = new Set<string>()

  for (const row of rawRows) {
    const name = cleanStr(row['fullName'] || row['Name'])
    if (!name) continue

    const dept = cleanStr(row['department'] || row['Department']) || "Medical Sciences"
    departmentSet.add(dept)

    const email = cleanStr(row['email'] || row['Email'])
    const vidwan = cleanStr(row['vidwanId'] || row['Vidwan ID'])
    const orcid = cleanStr(row['orcid'] || row['ORCID ID'])
    const scopus = cleanStr(row['scopusAuthorId'] || row['Scopus Author ID'])
    const researcher = cleanStr(row['researcherId'] || row['ResearcherID'])
    const scholar = cleanStr(row['googleScholarId'] || row['Google Scholar ID'])
    const bio = cleanStr(row['bio'] || row['Bio'])
    const photo = resolvePhotoUrl(row['photoUrl'] || row['Profile Image URL'] || row['Faculty Photo URL'] || row['Photo URL'], vidwan)
    const education = cleanStr(row['education'] || row['Education'])
    const experience = cleanStr(row['experience'] || row['Experience'])
    const expertiseStr = cleanStr(row['expertise'] || row['Expertise'])
    
    const expertise = expertiseStr
      ? expertiseStr.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0)
      : []

    // Distinct key: Vidwan ID or Name+Email
    const key = vidwan || `${name}::${email}`
    if (!facultyMap.has(key)) {
      facultyMap.set(key, {
        fullName: name,
        email: email,
        departmentName: dept,
        vidwanId: vidwan,
        orcid: orcid,
        scopusAuthorId: scopus,
        researcherId: researcher,
        googleScholarId: scholar,
        bio: bio,
        photoUrl: photo,
        education: education,
        experience: experience,
        expertise: expertise
      })
    } else {
      const existing = facultyMap.get(key)!
      if (!existing.email && email) existing.email = email
      if (!existing.orcid && orcid) existing.orcid = orcid
      if (!existing.scopusAuthorId && scopus) existing.scopusAuthorId = scopus
      if (!existing.researcherId && researcher) existing.researcherId = researcher
      if (!existing.googleScholarId && scholar) existing.googleScholarId = scholar
      if (!existing.photoUrl && photo) existing.photoUrl = photo
      if (!existing.bio && bio) existing.bio = bio
      if (!existing.education && education) existing.education = education
      if (!existing.experience && experience) existing.experience = experience
      if (existing.expertise.length === 0 && expertise.length > 0) existing.expertise = expertise
    }
  }

  console.log(`🏛️ Found ${departmentSet.size} unique departments.`)
  console.log(`👨‍🏫 Found ${facultyMap.size} unique faculty members.`)

  // Step 2: Upsert Departments
  console.log('\n--- Step 2: Creating Departments ---')
  const deptDbMap = new Map<string, string>() // Name -> ID
  for (const deptName of Array.from(departmentSet)) {
    const dept = await prisma.department.upsert({
      where: { name: deptName },
      update: {},
      create: {
        name: deptName,
        faculty: 'Faculty of Medicine & Health Sciences',
        college: 'Shri B. M. Patil Medical College, Hospital & Research Centre',
        campus: 'BLDE Main Campus, Vijayapura'
      }
    })
    deptDbMap.set(deptName, dept.id)
  }
  console.log(`✅ Upserted ${deptDbMap.size} departments.`)

  // Step 3: Create Users & Author Profiles
  console.log('\n--- Step 3: Creating Faculty Users and Author Profiles ---')
  const facultyPassword = await bcrypt.hash('BLDE@faculty2026', 12)
  const authorDbMap = new Map<string, string>() // key -> Author.id

  let facultyIndex = 1
  for (const [key, fac] of Array.from(facultyMap.entries())) {
    const deptId = deptDbMap.get(fac.departmentName)
    const doctorName = addDrPrefix(fac.fullName)

    // Construct valid login email
    const loginEmail = fac.email && fac.email.includes('@')
      ? fac.email.toLowerCase().trim()
      : `faculty_${fac.vidwanId || facultyIndex}@bldedu.ac.in`

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: loginEmail },
      update: {
        name: doctorName,
        departmentId: deptId,
        image: fac.photoUrl,
      },
      create: {
        email: loginEmail,
        name: doctorName,
        password: facultyPassword,
        role: UserRole.FACULTY,
        departmentId: deptId,
        image: fac.photoUrl,
      }
    })

    // Upsert Author
    let author = null
    if (fac.vidwanId) {
      author = await prisma.author.findUnique({ where: { vidwanId: fac.vidwanId } })
    }
    if (!author && fac.orcid) {
      author = await prisma.author.findUnique({ where: { orcid: fac.orcid } })
    }
    if (!author && fac.scopusAuthorId) {
      author = await prisma.author.findUnique({ where: { scopusAuthorId: fac.scopusAuthorId } })
    }

    const defaultBio = fac.bio || `${doctorName} is a distinguished faculty member in the Department of ${fac.departmentName} at BLDE (Deemed to be University), contributing extensively to clinical practice, healthcare education, and medical research.`

    const authorData = {
      fullName: doctorName,
      nameVariants: [doctorName, fac.fullName],
      orcid: fac.orcid || null,
      scopusAuthorId: fac.scopusAuthorId || null,
      googleScholarId: fac.googleScholarId || null,
      vidwanId: fac.vidwanId || null,
      researcherId: fac.researcherId || null,
      designation: 'Faculty Member',
      school: 'BLDE (Deemed to be University) - Shri B. M. Patil Medical College',
      primaryDeptId: deptId,
      userId: user.id,
      bio: defaultBio,
      education: fac.education || null,
      experience: fac.experience || null,
      expertise: fac.expertise,
      photoUrl: fac.photoUrl
    }

    if (author) {
      author = await prisma.author.update({
        where: { id: author.id },
        data: authorData
      })
    } else {
      author = await prisma.author.create({
        data: authorData
      })
    }

    authorDbMap.set(key, author.id)
    facultyIndex++
  }
  console.log(`✅ Upserted ${authorDbMap.size} faculty author profiles and user accounts.`)

  // Step 4: Import Publications, Citations, Keywords, and Authorships
  console.log('\n--- Step 4: Importing Publications & Linking Authorships ---')
  
  const pubDoiMap = new Map<string, string>()
  const pubTitleYearMap = new Map<string, string>()

  let importedPubCount = 0
  let linkedAuthorshipCount = 0
  let skippedPubCount = 0

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]
    const title = cleanStr(row['title'] || row['Title'])
    if (!title) {
      skippedPubCount++
      continue
    }

    const facName = cleanStr(row['fullName'] || row['Name'])
    const facEmail = cleanStr(row['email'] || row['Email'])
    const facVidwan = cleanStr(row['vidwanId'] || row['Vidwan ID'])
    const facKey = facVidwan || `${facName}::${facEmail}`
    const authorId = authorDbMap.get(facKey)

    const rawYear = cleanStr(row['year'] || row['Publication Year'])
    let year = parseInt(rawYear) || 2024
    if (year < 1970 || year > 2030) year = 2024

    const pubTypeStr = cleanStr(row['type'] || row['Publication Type'])
    const pubType = mapPublicationType(pubTypeStr)
    const journalName = cleanStr(row['journal'] || row['Journal Name'])
    const issn = cleanStr(row['issn'] || row['ISSN'])
    const doi = cleanStr(row['doi'] || row['DOI']).toLowerCase().trim()
    const citationsStr = cleanStr(row['citations'] || row['Citations'])
    const citations = parseInt(citationsStr) || 0
    const keywordsStr = cleanStr(row['keywords'] || row['Keywords'])

    // Journal handling
    let journalId: string | null = null
    if (journalName) {
      let journal = await prisma.journal.findFirst({
        where: {
          title: { equals: journalName, mode: 'insensitive' }
        }
      })
      if (!journal) {
        journal = await prisma.journal.create({
          data: {
            title: journalName,
            issn: issn || null,
          }
        })
      }
      journalId = journal.id
    }

    // Check if publication already exists by DOI or Title+Year
    let pubId: string | null = null
    const normTitleYearKey = `${normalizeTitle(title)}::${year}`

    if (doi && pubDoiMap.has(doi)) {
      pubId = pubDoiMap.get(doi)!
    } else if (pubTitleYearMap.has(normTitleYearKey)) {
      pubId = pubTitleYearMap.get(normTitleYearKey)!
    } else if (doi) {
      // Check database for DOI
      const existing = await prisma.publication.findUnique({ where: { doi: doi } })
      if (existing) {
        pubId = existing.id
        pubDoiMap.set(doi, pubId)
        pubTitleYearMap.set(normTitleYearKey, pubId)
      }
    }

    if (!pubId) {
      // Create new publication
      const newPub = await prisma.publication.create({
        data: {
          title: title,
          doi: doi || null,
          year: year,
          publicationType: pubType,
          source: ImportSource.MANUAL,
          verificationStatus: VerificationStatus.VERIFIED,
          journalId: journalId,
          indexing: {
            create: {
              indexedScopus: citations > 0 || (issn && issn.length > 0) ? true : false,
              indexedGoogleScholar: true,
            }
          },
          citations: citations > 0 ? {
            create: {
              citationsScopus: citations,
            }
          } : undefined
        }
      })

      pubId = newPub.id
      if (doi) pubDoiMap.set(doi, pubId)
      pubTitleYearMap.set(normTitleYearKey, pubId)
      importedPubCount++

      // Create keywords if present
      if (keywordsStr) {
        const kwList = keywordsStr.split(/[,;\n]/).map(k => k.trim()).filter(k => k.length > 1 && k.length < 100)
        for (const kwText of kwList.slice(0, 10)) {
          try {
            const kw = await prisma.keyword.upsert({
              where: { keywordText: kwText },
              update: {},
              create: { keywordText: kwText }
            })
            await prisma.publicationKeyword.create({
              data: {
                publicationId: pubId,
                keywordId: kw.id,
              }
            }).catch(() => {})
          } catch (e) {
            // Ignore keyword error
          }
        }
      }
    }

    // Link authorship if author exists
    if (authorId && pubId) {
      const existingAuthorship = await prisma.authorship.findUnique({
        where: {
          publicationId_authorId: {
            publicationId: pubId,
            authorId: authorId
          }
        }
      })

      if (!existingAuthorship) {
        const facultyObj = facultyMap.get(facKey)
        const deptId = facultyObj ? deptDbMap.get(facultyObj.departmentName) : null
        
        await prisma.authorship.create({
          data: {
            publicationId: pubId,
            authorId: authorId,
            authorOrder: 1,
            internalAuthor: true,
            departmentId: deptId
          }
        })
        linkedAuthorshipCount++
      }
    }

    if ((i + 1) % 500 === 0 || i === rawRows.length - 1) {
      console.log(`  Processed ${i + 1}/${rawRows.length} records... (Unique Pubs: ${importedPubCount}, Authorships: ${linkedAuthorshipCount})`)
    }
  }

  console.log('\n=============================================')
  console.log('🎉 DATA IMPORT COMPLETE SUMMARY')
  console.log('=============================================')
  console.log(`🏛️ Departments Created:      ${deptDbMap.size}`)
  console.log(`👨‍🏫 Faculty Profiles Added:   ${authorDbMap.size}`)
  console.log(`📚 Unique Publications Added: ${importedPubCount}`)
  console.log(`🔗 Authorships Linked:        ${linkedAuthorshipCount}`)
  console.log('=============================================')
}

async function main() {
  try {
    await cleanDummyData()
    await importRealData()
  } catch (error) {
    console.error('❌ Error executing clean and import:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
