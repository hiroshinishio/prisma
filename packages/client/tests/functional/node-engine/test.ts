import { NewPrismaClient } from '../_utils/types'
import testMatrix from './_matrix'
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore this is just for type checks
import type { PrismaClient } from './node_modules/@prisma/client'

declare let prisma: PrismaClient<{ log: [{ emit: 'event'; level: 'query' }] }>
declare let newPrismaClient: NewPrismaClient<typeof PrismaClient>

testMatrix.setupTestSuite(
  (suiteConfig, suiteMeta) => {
    describe('findMany', () => {
      describe('multiple _count (issue 11974)', () => {
        beforeAll(async () => {
          prisma = newPrismaClient({
            log: ['query'],
          })

          await prisma.comment.create({
            data: {
              id: '1',
              downVotedUsers: {
                create: {
                  uid: '2',
                },
              },
              upVotedUsers: {
                create: {
                  uid: '3',
                },
              },
            },
          })
        })
        afterAll(async () => {
          await prisma.$disconnect()
        })

        test('should not throw an error when counting two relation fields using find', async () => {
          const response = await prisma.comment.findMany({
            include: {
              _count: {
                select: {
                  upVotedUsers: true,
                  downVotedUsers: true,
                },
              },
            },
          })

          expect(response).toMatchObject([{ id: '1', _count: { upVotedUsers: 1, downVotedUsers: 1 } }])
        })

        test('should not throw an error when counting two relation fields using find (other way around)', async () => {
          const response = await prisma.user.findMany({
            include: {
              _count: {
                select: {
                  upVotedComments: true,
                  downVotedComments: true,
                },
              },
            },
          })

          expect(response).toMatchObject([
            { uid: '2', _count: { upVotedComments: 0, downVotedComments: 1 } },
            { uid: '3', _count: { upVotedComments: 1, downVotedComments: 0 } },
          ])
        })
      })

      describe('single _count (issue 12557)', () => {
        beforeAll(() => {
          prisma = newPrismaClient({
            // log: [ 'query' ],
          })
        })

        afterAll(async () => {
          await prisma.$disconnect()
        })

        test('issue 12557', async () => {
          await prisma.category.create({
            data: {
              name: 'cat-1',
              brands: {
                create: [{ name: 'brand-1' }, { name: 'brand-2' }],
              },
            },
          })

          await prisma.category.create({
            data: {
              name: 'cat-2',
              brands: {
                create: [{ name: 'brand-3' }, { name: 'brand-4' }],
              },
            },
            include: { brands: true },
          })

          const categories = await prisma.category.findMany({
            include: {
              _count: {
                select: { brands: true },
              },
            },
          })
          expect(categories).toMatchObject([
            {
              _count: { brands: 2 },
              name: 'cat-1',
            },
            {
              _count: { brands: 2 },
              name: 'cat-2',
            },
          ])

          await prisma.brand.delete({ where: { name: 'brand-1' } })

          const categoriesAfterBrand1Deletion = await prisma.category.findMany({
            include: {
              _count: {
                select: { brands: true },
              },
            },
          })
          expect(categoriesAfterBrand1Deletion).toMatchObject([
            {
              _count: { brands: 1 },
              name: 'cat-1',
            },
            {
              _count: { brands: 2 },
              name: 'cat-2',
            },
          ])
        })
      })
    })
  },
  {
    optOut: {
      from: ['sqlite', 'mysql', 'mongodb', 'cockroachdb', 'sqlserver'],
      reason: 'lazyness for now',
    },
  },
)
