import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function dateAtOffset(daysFromToday: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed demo jest zablokowany w środowisku produkcyjnym.');
  }
  if (process.env.SEED_DEMO_RESET !== 'true') {
    throw new Error(
      'Seed demo usuwa wszystkie dane. Ustaw SEED_DEMO_RESET=true, aby potwierdzić pełny reset bazy.',
    );
  }

  console.log('🌱 Rozpoczynam zasilanie bazy pełnymi danymi testowymi...');

  await prisma.$transaction(async (tx) => {
    await tx.review.deleteMany();
    await tx.attendance.deleteMany();
    await tx.monthlyGrade.deleteMany();
    await tx.financialReport.deleteMany();
    await tx.booking.deleteMany();
    await tx.lesson.deleteMany();
    await tx.availability.deleteMany();
    await tx.tutorSubject.deleteMany();
    await tx.subjectRequest.deleteMany();
    await tx.subject.deleteMany();
    await tx.user.deleteMany();
    await tx.role.deleteMany();
  });

  const [adminRole, studentRole, tutorRole] = await Promise.all([
    prisma.role.create({ data: { name: 'admin' } }),
    prisma.role.create({ data: { name: 'student' } }),
    prisma.role.create({ data: { name: 'tutor' } }),
  ]);
  const passwordHash = await bcrypt.hash('haslo123', 10);

  const [admin, tutor1, tutor2, student1, student2] = await Promise.all([
    prisma.user.create({
      data: {
        first_name: 'Jan',
        last_name: 'Kowalski',
        email: 'admin@studyflow.pl',
        password_hash: passwordHash,
        role_id: adminRole.id_roles,
        status: 'ACTIVE',
        phone: '+48 600 100 200',
      },
    }),
    prisma.user.create({
      data: {
        first_name: 'Marta',
        last_name: 'Vitiaz',
        email: 'tutor@studyflow.pl',
        password_hash: passwordHash,
        role_id: tutorRole.id_roles,
        status: 'ACTIVE',
        phone: '+48 600 300 400',
        experience: '5 lat doświadczenia',
        about_me:
          'Absolwentka informatyki. Specjalizuję się w matematyce dyskretnej oraz programowaniu w TypeScript i Python.',
      },
    }),
    prisma.user.create({
      data: {
        first_name: 'Dariusz',
        last_name: 'Zazin',
        email: 'dariusz@studyflow.pl',
        password_hash: passwordHash,
        role_id: tutorRole.id_roles,
        status: 'ACTIVE',
        phone: '+48 600 500 600',
        experience: '8 lat doświadczenia',
        about_me:
          'Certyfikowany lektor języka angielskiego. Przygotowuję do egzaminów maturalnych oraz języka biznesowego.',
      },
    }),
    prisma.user.create({
      data: {
        first_name: 'Piotr',
        last_name: 'Nowak',
        email: 'student@studyflow.pl',
        password_hash: passwordHash,
        role_id: studentRole.id_roles,
        status: 'ACTIVE',
        phone: '+48 700 111 222',
      },
    }),
    prisma.user.create({
      data: {
        first_name: 'Anna',
        last_name: 'Wiśniewska',
        email: 'anna@studyflow.pl',
        password_hash: passwordHash,
        role_id: studentRole.id_roles,
        status: 'ACTIVE',
        phone: '+48 700 333 444',
      },
    }),
  ]);

  const [math, programming, english, physics] = await Promise.all([
    prisma.subject.create({
      data: {
        name: 'Matematyka',
        description:
          'Algebra, geometria, analiza matematyczna oraz przygotowanie do matury.',
      },
    }),
    prisma.subject.create({
      data: {
        name: 'Programowanie w React/TS',
        description:
          'Tworzenie aplikacji frontendowych z Vite, React i TypeScript.',
      },
    }),
    prisma.subject.create({
      data: {
        name: 'Język angielski',
        description:
          'Konwersacje, gramatyka oraz angielski biznesowy na poziomie B2/C1.',
      },
    }),
    prisma.subject.create({
      data: {
        name: 'Fizyka',
        description: 'Fizyka dla uczniów szkół średnich oraz studentów.',
      },
    }),
  ]);

  await prisma.tutorSubject.createMany({
    data: [
      {
        tutor_id: tutor1.id_users,
        subject_id: math.id_subjects,
        price_per_hour: 70,
        experience_years: 5,
      },
      {
        tutor_id: tutor1.id_users,
        subject_id: programming.id_subjects,
        price_per_hour: 90,
        experience_years: 4,
      },
      {
        tutor_id: tutor2.id_users,
        subject_id: english.id_subjects,
        price_per_hour: 60,
        experience_years: 8,
      },
      {
        tutor_id: tutor2.id_users,
        subject_id: physics.id_subjects,
        price_per_hour: 75,
        experience_years: 6,
      },
    ],
  });

  await prisma.availability.createMany({
    data: [
      {
        tutor_id: tutor1.id_users,
        day_of_week: 'Poniedziałek',
        start_time: '14:00',
        end_time: '18:00',
        is_active: true,
      },
      {
        tutor_id: tutor1.id_users,
        day_of_week: 'Środa',
        start_time: '15:00',
        end_time: '19:00',
        is_active: true,
      },
      {
        tutor_id: tutor2.id_users,
        day_of_week: 'Wtorek',
        start_time: '10:00',
        end_time: '16:00',
        is_active: true,
      },
      {
        tutor_id: tutor2.id_users,
        day_of_week: 'Czwartek',
        start_time: '12:00',
        end_time: '17:00',
        is_active: true,
      },
    ],
  });

  const [
    completedMath,
    reviewEligibleProgramming,
    bookedProgramming,
    availableEnglish,
    completedEnglish,
  ] = await Promise.all([
    prisma.lesson.create({
      data: {
        tutor_id: tutor1.id_users,
        subject_id: math.id_subjects,
        lesson_date: dateAtOffset(-2),
        start_time: '15:00',
        end_time: '16:00',
        status: 'COMPLETED',
        created_by: tutor1.id_users,
      },
    }),
    prisma.lesson.create({
      data: {
        tutor_id: tutor1.id_users,
        subject_id: programming.id_subjects,
        lesson_date: dateAtOffset(-3),
        start_time: '16:30',
        end_time: '17:30',
        status: 'COMPLETED',
        created_by: tutor1.id_users,
      },
    }),
    prisma.lesson.create({
      data: {
        tutor_id: tutor1.id_users,
        subject_id: programming.id_subjects,
        lesson_date: dateAtOffset(3),
        start_time: '16:30',
        end_time: '17:30',
        status: 'SCHEDULED',
        created_by: tutor1.id_users,
      },
    }),
    prisma.lesson.create({
      data: {
        tutor_id: tutor2.id_users,
        subject_id: english.id_subjects,
        lesson_date: dateAtOffset(4),
        start_time: '12:00',
        end_time: '13:00',
        status: 'SCHEDULED',
        created_by: tutor2.id_users,
      },
    }),
    prisma.lesson.create({
      data: {
        tutor_id: tutor2.id_users,
        subject_id: english.id_subjects,
        lesson_date: dateAtOffset(-1),
        start_time: '12:00',
        end_time: '13:00',
        status: 'COMPLETED',
        created_by: tutor2.id_users,
      },
    }),
  ]);

  const [booking1, booking2, booking3, booking4] = await Promise.all([
    prisma.booking.create({
      data: {
        lesson_id: completedMath.id_lessons,
        student_id: student1.id_users,
        status: 'CONFIRMED',
      },
    }),
    prisma.booking.create({
      data: {
        lesson_id: reviewEligibleProgramming.id_lessons,
        student_id: student1.id_users,
        status: 'CONFIRMED',
      },
    }),
    prisma.booking.create({
      data: {
        lesson_id: bookedProgramming.id_lessons,
        student_id: student1.id_users,
        status: 'CONFIRMED',
      },
    }),
    prisma.booking.create({
      data: {
        lesson_id: completedEnglish.id_lessons,
        student_id: student2.id_users,
        status: 'CONFIRMED',
      },
    }),
  ]);

  await prisma.attendance.createMany({
    data: [
      {
        booking_id: booking1.id_bookings,
        present: true,
        marked_by: tutor1.id_users,
      },
      {
        booking_id: booking4.id_bookings,
        present: true,
        marked_by: tutor2.id_users,
      },
    ],
  });

  const now = new Date();
  await prisma.monthlyGrade.createMany({
    data: [
      {
        student_id: student1.id_users,
        tutor_id: tutor1.id_users,
        subject_id: math.id_subjects,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        grade: 5,
        comment:
          'Świetne postępy w algebrze i bardzo wysoka frekwencja na zajęciach.',
      },
      {
        student_id: student2.id_users,
        tutor_id: tutor2.id_users,
        subject_id: english.id_subjects,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        grade: 4.5,
        comment: 'Bardzo dobra praca nad słownictwem branżowym.',
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      {
        student_id: student1.id_users,
        tutor_id: tutor1.id_users,
        lesson_id: completedMath.id_lessons,
        rating: 5,
        comment:
          'Świetne podejście do ucznia! Wszystko dokładnie wytłumaczone.',
      },
      {
        student_id: student2.id_users,
        tutor_id: tutor2.id_users,
        lesson_id: completedEnglish.id_lessons,
        rating: 5,
        comment: 'Lekcje przebiegają w bardzo miłej i bezstresowej atmosferze.',
      },
    ],
  });

  await prisma.subjectRequest.create({
    data: {
      tutor_id: tutor1.id_users,
      subject_name: 'Bazy danych',
      description:
        'Propozycja zajęć z SQL i projektowania relacyjnych baz danych.',
      status: 'PENDING',
    },
  });

  await prisma.financialReport.create({
    data: {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      generated_by_user_id: admin.id_users,
      total_student_cost: 2950,
      total_tutor_salary: 2360,
    },
  });

  console.log('✅ Baza została zasilona danymi demo.');
  console.log('Konta testowe:');
  console.log('Administrator: admin@studyflow.pl');
  console.log('Korepetytorzy: tutor@studyflow.pl, dariusz@studyflow.pl');
  console.log('Uczniowie: student@studyflow.pl, anna@studyflow.pl');
  console.log('Hasło dla wszystkich kont: haslo123');
  console.log(
    `Utworzono ${[booking1, booking2, booking3, booking4].length} rezerwacje. Dostępny termin ma ID ${availableEnglish.id_lessons}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('❌ Błąd podczas zasilania bazy:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
