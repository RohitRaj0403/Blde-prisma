import { PrismaClient, UserRole, PublicationType, ImportSource, VerificationStatus, AffiliationType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@blde.ac.in' },
    update: {},
    create: {
      email: 'admin@blde.ac.in',
      name: 'Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  // Departments
  const departments = await Promise.all([
    prisma.department.upsert({ where: { name: 'Medicine' }, update: {}, create: { name: 'Medicine', faculty: 'Clinical Sciences', college: 'BLDE Medical College' } }),
    prisma.department.upsert({ where: { name: 'Surgery' }, update: {}, create: { name: 'Surgery', faculty: 'Clinical Sciences', college: 'BLDE Medical College' } }),
    prisma.department.upsert({ where: { name: 'Biochemistry' }, update: {}, create: { name: 'Biochemistry', faculty: 'Basic Sciences', college: 'BLDE Medical College' } }),
    prisma.department.upsert({ where: { name: 'Pharmacology' }, update: {}, create: { name: 'Pharmacology', faculty: 'Basic Sciences', college: 'BLDE Medical College' } }),
    prisma.department.upsert({ where: { name: 'Pathology' }, update: {}, create: { name: 'Pathology', faculty: 'Basic Sciences', college: 'BLDE Medical College' } }),
    prisma.department.upsert({ where: { name: 'Radiology' }, update: {}, create: { name: 'Radiology', faculty: 'Clinical Sciences', college: 'BLDE Medical College' } }),
  ])

  // Faculty users
  const facultyPassword = await bcrypt.hash('faculty123', 12)
  await prisma.user.upsert({
    where: { email: 'verifier@blde.ac.in' },
    update: {},
    create: {
      email: 'verifier@blde.ac.in',
      name: 'Library Coordinator',
      password: facultyPassword,
      role: UserRole.VERIFIER,
      departmentId: departments[0].id,
    },
  })

  const facultyUser = await prisma.user.upsert({
    where: { email: 'faculty@blde.ac.in' },
    update: {},
    create: {
      email: 'faculty@blde.ac.in',
      name: 'Dr. Anil Kumar S',
      password: facultyPassword,
      role: UserRole.FACULTY,
      departmentId: departments[0].id,
    },
  })

  // Publishers
  const elsevier = await prisma.publisher.upsert({ where: { name: 'Elsevier' }, update: {}, create: { name: 'Elsevier' } })
  const springer = await prisma.publisher.upsert({ where: { name: 'Springer Nature' }, update: {}, create: { name: 'Springer Nature' } })
  const wiley = await prisma.publisher.upsert({ where: { name: 'Wiley' }, update: {}, create: { name: 'Wiley' } })
  const wolters = await prisma.publisher.upsert({ where: { name: 'Wolters Kluwer' }, update: {}, create: { name: 'Wolters Kluwer' } })

  // Journals
  const journals = await Promise.all([
    prisma.journal.create({ data: { title: 'Indian Journal of Medical Research', issn: '0971-5916', publisherId: elsevier.id } }),
    prisma.journal.create({ data: { title: 'Journal of Clinical Investigation', issn: '0021-9738', publisherId: springer.id } }),
    prisma.journal.create({ data: { title: 'PLOS ONE', issn: '1932-6203', publisherId: wiley.id } }),
    prisma.journal.create({ data: { title: 'Indian Journal of Pathology and Microbiology', issn: '0377-4929', publisherId: wolters.id } }),
  ])

  // Internal affiliation
  const internalAffil = await prisma.affiliation.create({
    data: {
      institutionName: 'BLDE (Deemed to be University)',
      type: AffiliationType.INTERNAL,
      mappingRule: 'BLDE|Bijapur Liberal District Education',
    },
  })

  // Authors
  const authors = await Promise.all([
    prisma.author.create({
      data: {
        fullName: 'Dr. Anil Kumar S',
        nameVariants: ['Kumar A', 'Anil Kumar S'],
        orcid: '0000-0001-1234-5678',
        scopusAuthorId: '57195432101',
        googleScholarId: 'fo42anktZ9vv',
        vidwanId: '394851',
        researcherId: 'H-8274-2018',
        designation: 'Professor & Head',
        school: 'BLDE Medical College',
        primaryDeptId: departments[0].id,
        userId: facultyUser.id,
        bio: 'Professor & Head of Medicine at BLDE Medical College. Specializes in cardiovascular diseases, type 2 diabetes management, and clinical research methodologies with over 15 years of academic experience.',
        education: '• Ph.D. in Medicine, Bangalore Medical College, 2012\n• MD in General Medicine, KIMS Hubli, 2008\n• MBBS, Mysore Medical College, 2004',
        experience: '• Professor & Head, Department of Medicine, BLDE DU (2020 - Present)\n• Associate Professor, Department of Medicine, BLDE DU (2015 - 2020)\n• Assistant Professor, Victoria Hospital, Bangalore (2009 - 2015)',
        expertise: ['Cardiology', 'Diabetes Mellitus', 'Clinical Trials', 'Internal Medicine'],
        photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250&h=250'
      }
    }),
    prisma.author.create({
      data: {
        fullName: 'Dr. Priya Sharma',
        nameVariants: ['Sharma P', 'P Sharma'],
        orcid: '0000-0002-9876-5432',
        scopusAuthorId: '57234567890',
        googleScholarId: 'xPq8901tZ2vv',
        vidwanId: '394852',
        researcherId: 'H-8274-2019',
        designation: 'Associate Professor',
        school: 'BLDE Medical College',
        primaryDeptId: departments[2].id,
        bio: 'Associate Professor of Biochemistry with research focus on metabolic pathways and biomarker discovery in endocrine disorders.',
        education: '• MD in Biochemistry, JIPMER, 2013\n• MBBS, Kasturba Medical College, 2009',
        experience: '• Associate Professor, BLDE DU (2018 - Present)\n• Assistant Professor, Manipal Academy of Higher Education (2014 - 2018)',
        expertise: ['Biochemistry', 'Endocrinology', 'Biomarkers', 'Metabolism'],
        photoUrl: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=250&h=250'
      }
    }),
    prisma.author.create({
      data: {
        fullName: 'Dr. Rajesh Patil',
        nameVariants: ['Patil R', 'R Patil'],
        orcid: '0000-0003-1111-2222',
        scopusAuthorId: '57195432100',
        googleScholarId: 'yPr1234tZ5vv',
        vidwanId: '394853',
        researcherId: 'H-8274-2020',
        designation: 'Assistant Professor',
        school: 'School of Allied Health Sciences',
        primaryDeptId: departments[4].id,
        bio: 'Assistant Professor of Pathology with expertise in cytopathology and oncological staging.',
        education: '• MD in Pathology, St. Johns Medical College, 2017\n• MBBS, BLDE Medical College, 2013',
        experience: '• Assistant Professor, Department of Pathology, BLDE DU (2018 - Present)',
        expertise: ['Pathology', 'Cytopathology', 'Oncology', 'Biopsy'],
        photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=250&h=250'
      }
    }),
    prisma.author.create({
      data: {
        fullName: 'Dr. Sunita Kulkarni',
        nameVariants: ['Kulkarni S'],
        orcid: '0000-0004-3333-4444',
        scopusAuthorId: '57195432102',
        googleScholarId: 'zPs5678tZ8vv',
        vidwanId: '394854',
        researcherId: 'H-8274-2021',
        designation: 'Professor',
        school: 'BLDE Medical College',
        primaryDeptId: departments[1].id,
        bio: 'Professor of Surgery specializing in laparoscopy and minimally invasive clinical procedures.',
        education: '• MS in General Surgery, Mysore Medical College, 2005\n• MBBS, KMC Mangalore, 2001',
        experience: '• Professor, Department of Surgery, BLDE DU (2016 - Present)\n• Assistant Professor, KLES Hospital, Belgaum (2006 - 2016)',
        expertise: ['General Surgery', 'Laparoscopy', 'Gastroenterology', 'Minimally Invasive Surgery'],
        photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250&h=250'
      }
    }),
  ])

  // Sample publications
  const pubs = await Promise.all([
    prisma.publication.create({
      data: {
        title: 'Prevalence of Type 2 Diabetes and its Association with Metabolic Syndrome in Rural Karnataka',
        abstract: 'A cross-sectional study examining the prevalence of Type 2 diabetes and metabolic syndrome in rural Karnataka.',
        doi: '10.1234/ijmr.2023.001',
        year: 2023,
        publicationType: PublicationType.ARTICLE,
        source: ImportSource.SCOPUS,
        verificationStatus: VerificationStatus.VERIFIED,
        journalId: journals[0].id,
        indexing: {
          create: {
            indexedScopus: true,
            indexedUgcCare: true,
            indexedPubmed: true,
          },
        },
        citations: { create: { citationsScopus: 12, citationsWos: 8 } },
        keywords: {
          create: [
            { keyword: { connectOrCreate: { where: { keywordText: 'Diabetes Mellitus' }, create: { keywordText: 'Diabetes Mellitus' } } }, keywordType: 'AUTHOR' },
            { keyword: { connectOrCreate: { where: { keywordText: 'Metabolic Syndrome' }, create: { keywordText: 'Metabolic Syndrome' } } }, keywordType: 'AUTHOR' },
            { keyword: { connectOrCreate: { where: { keywordText: 'Karnataka' }, create: { keywordText: 'Karnataka' } } }, keywordType: 'AUTHOR' },
          ],
        },
      },
    }),
    prisma.publication.create({
      data: {
        title: 'Histopathological Patterns of Cervical Lesions: A Five-Year Retrospective Study',
        abstract: 'Retrospective analysis of cervical biopsy specimens over five years at a tertiary care center.',
        doi: '10.1234/ijpm.2022.045',
        year: 2022,
        publicationType: PublicationType.ARTICLE,
        source: ImportSource.PUBMED,
        verificationStatus: VerificationStatus.VERIFIED,
        journalId: journals[3].id,
        indexing: {
          create: {
            indexedScopus: true,
            indexedPubmed: true,
            indexedUgcCare: true,
          },
        },
        citations: { create: { citationsScopus: 7, citationsPubmed: 5 } },
        keywords: {
          create: [
            { keyword: { connectOrCreate: { where: { keywordText: 'Cervical Pathology' }, create: { keywordText: 'Cervical Pathology' } } }, keywordType: 'AUTHOR' },
            { keyword: { connectOrCreate: { where: { keywordText: 'Histopathology' }, create: { keywordText: 'Histopathology' } } }, keywordType: 'INDEX' },
          ],
        },
      },
    }),
    prisma.publication.create({
      data: {
        title: 'Antimicrobial Resistance Patterns of Gram-Negative Bacteria in ICU Settings',
        doi: '10.1234/jci.2023.089',
        year: 2023,
        publicationType: PublicationType.ARTICLE,
        source: ImportSource.WOS,
        verificationStatus: VerificationStatus.PENDING,
        journalId: journals[1].id,
        indexing: {
          create: {
            indexedWos: true,
            indexedScopus: true,
          },
        },
        citations: { create: { citationsWos: 3 } },
        keywords: {
          create: [
            { keyword: { connectOrCreate: { where: { keywordText: 'Antimicrobial Resistance' }, create: { keywordText: 'Antimicrobial Resistance' } } }, keywordType: 'AUTHOR' },
            { keyword: { connectOrCreate: { where: { keywordText: 'ICU' }, create: { keywordText: 'ICU' } } }, keywordType: 'AUTHOR' },
          ],
        },
      },
    }),
  ])

  // Authorships
  await prisma.authorship.createMany({
    data: [
      { publicationId: pubs[0].id, authorId: authors[0].id, authorOrder: 1, isCorresponding: true, affiliationId: internalAffil.id, departmentId: departments[0].id, internalAuthor: true },
      { publicationId: pubs[0].id, authorId: authors[1].id, authorOrder: 2, isCorresponding: false, affiliationId: internalAffil.id, departmentId: departments[2].id, internalAuthor: true },
      { publicationId: pubs[1].id, authorId: authors[2].id, authorOrder: 1, isCorresponding: true, affiliationId: internalAffil.id, departmentId: departments[4].id, internalAuthor: true },
      { publicationId: pubs[1].id, authorId: authors[3].id, authorOrder: 2, isCorresponding: false, affiliationId: internalAffil.id, departmentId: departments[1].id, internalAuthor: true },
      { publicationId: pubs[2].id, authorId: authors[0].id, authorOrder: 1, isCorresponding: true, affiliationId: internalAffil.id, departmentId: departments[0].id, internalAuthor: true },
    ],
  })

  console.log('✅ Seed complete.')
  console.log('   Admin:    admin@blde.ac.in / admin123')
  console.log('   Verifier: verifier@blde.ac.in / faculty123')
  console.log('   Faculty:  faculty@blde.ac.in / faculty123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
