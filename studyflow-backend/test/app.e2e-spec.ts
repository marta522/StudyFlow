import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { csrfProtection } from '../src/auth/csrf.middleware';
import { PrismaService } from '../src/prisma/prisma.service';

interface TestUser {
  id_users: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  token_version: number;
  status: string;
  role: { name: string };
}

describe('Booking flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createPrismaMock>;

  function createPrismaMock(users: TestUser[]) {
    let lesson:
      | {
          id_lessons: number;
          tutor_id: number;
          subject_id: number;
          lesson_date: Date;
          start_time: string;
          end_time: string;
          status: string;
          created_by: number;
          subject: { name: string; status: string };
          tutor: { id_users: number; first_name: string; last_name: string };
        }
      | undefined;
    const activeBookings: Array<{
      id_bookings: number;
      lesson_id: number;
      student_id: number;
      status: string;
      note?: string;
    }> = [];
    const transactionClient = {
      user: {
        findFirst: jest.fn(async () => null),
      },
      tutorSubject: {
        findFirst: jest.fn(async () => ({
          id_tutor_subjects: 1,
          subject: { name: 'Matematyka', status: 'ACTIVE' },
        })),
      },
      availability: {
        findFirst: jest.fn(async () => ({ id_availability: 1 })),
      },
      lesson: {
        findFirst: jest.fn(async () => null),
        findUnique: jest.fn(async () =>
          lesson
            ? {
                ...lesson,
                bookings: activeBookings.map((booking) => ({
                  ...booking,
                })),
              }
            : null,
        ),
        create: jest.fn(
          async ({
            data,
          }: {
            data: {
              tutor_id: number;
              subject_id: number;
              lesson_date: Date;
              start_time: string;
              end_time: string;
              created_by: number;
            };
          }) => {
            lesson = {
              id_lessons: 13,
              ...data,
              status: 'SCHEDULED',
              subject: { name: 'Matematyka', status: 'ACTIVE' },
              tutor: {
                id_users: 7,
                first_name: 'Tomasz',
                last_name: 'Kowalski',
              },
            };
            return { ...lesson, bookings: [] };
          },
        ),
      },
      booking: {
        create: jest.fn(
          async ({
            data,
          }: {
            data: { lesson_id: number; student_id: number; note?: string };
          }) => {
            const booking = {
              id_bookings: 21,
              ...data,
              status: 'CONFIRMED',
            };
            activeBookings.push(booking);
            return {
              ...booking,
              lesson: {
                ...lesson,
                subject: { name: 'Matematyka' },
              },
            };
          },
        ),
      },
      notification: { create: jest.fn(async () => ({})) },
      adminAuditLog: { create: jest.fn(async () => ({})) },
    };

    return {
      user: {
        findUnique: jest.fn(
          async ({ where }: { where: { id_users?: number; email?: string } }) =>
            users.find(
              (user) =>
                (where.id_users !== undefined &&
                  user.id_users === where.id_users) ||
                (where.email !== undefined && user.email === where.email),
            ) ?? null,
        ),
      },
      lesson: {
        updateMany: jest.fn(async () => ({ count: 0 })),
        findMany: jest.fn(async () => []),
      },
      $transaction: jest.fn(
        async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??= 'file:./e2e-test.db';
    process.env.JWT_SECRET ??=
      'studyflow-e2e-test-secret-with-at-least-32-characters';
    process.env.TUTOR_SALARY_PERCENT ??= '80';
    const passwordHash = await bcrypt.hash('StrongTestPassword123', 4);
    const users: TestUser[] = [
      {
        id_users: 7,
        first_name: 'Tomasz',
        last_name: 'Kowalski',
        email: 'tutor@example.test',
        password_hash: passwordHash,
        token_version: 0,
        status: 'ACTIVE',
        role: { name: 'tutor' },
      },
      {
        id_users: 9,
        first_name: 'Anna',
        last_name: 'Nowak',
        email: 'student@example.test',
        password_hash: passwordHash,
        token_version: 0,
        status: 'ACTIVE',
        role: { name: 'student' },
      },
    ];
    prisma = createPrismaMock(users);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.use('/api', csrfProtection);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('authenticates with session cookies and CSRF, then rejects a duplicate booking with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'tutor@example.test', password: 'StrongTestPassword123' })
      .expect(403);

    async function login(email: string) {
      const agent = request.agent(app.getHttpServer());
      const csrfResponse = await agent.get('/api/auth/csrf').expect(200);
      const csrfToken = csrfResponse.body.csrfToken as string;
      await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({ email, password: 'StrongTestPassword123' })
        .expect(201);
      return { agent, csrfToken };
    }

    const tutor = await login('tutor@example.test');
    const student = await login('student@example.test');
    const lessonDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const lessonResponse = await tutor.agent
      .post('/api/bookings/lessons')
      .set('X-CSRF-Token', tutor.csrfToken)
      .send({
        subject_id: 3,
        lesson_date: lessonDate,
        start_time: '14:00',
        end_time: '15:00',
      })
      .expect(201);
    const lessonId = lessonResponse.body.id_lessons as number;

    await student.agent
      .post('/api/bookings/book')
      .set('X-CSRF-Token', student.csrfToken)
      .send({ lesson_id: lessonId })
      .expect(201);

    await student.agent
      .post('/api/bookings/book')
      .set('X-CSRF-Token', student.csrfToken)
      .send({ lesson_id: lessonId })
      .expect(409);
  });
});
