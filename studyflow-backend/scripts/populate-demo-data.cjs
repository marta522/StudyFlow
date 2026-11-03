const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const backendRoot = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendRoot, '.env'));

const prisma = new PrismaClient();
const expansionKey = 'DEMO_DATA_EXPANSION_LARGE_V1';
const demoPassword = 'Haslo123';
const subjectDefinitions = [
  ['Chemia', 'Chemia ogólna, organiczna i przygotowanie do matury.'],
  ['Biologia', 'Biologia człowieka, genetyka i przygotowanie do matury.'],
  ['Historia', 'Historia powszechna, Polski i przygotowanie do egzaminów.'],
  ['Geografia', 'Geografia fizyczna, społeczno-ekonomiczna i maturalna.'],
  ['Język polski', 'Analiza tekstów, gramatyka i przygotowanie do matury.'],
  ['Język niemiecki', 'Gramatyka, konwersacje i przygotowanie do certyfikatów.'],
  ['Język hiszpański', 'Podstawy języka, konwersacje i gramatyka.'],
  ['Ekonomia', 'Podstawy ekonomii, mikroekonomia i makroekonomia.'],
  ['Statystyka', 'Statystyka opisowa, rachunek prawdopodobieństwa i analiza danych.'],
  ['Algorytmy i struktury danych', 'Algorytmy, struktury danych i rozwiązywanie zadań.'],
  ['C++ i programowanie obiektowe', 'Programowanie w C++, OOP i podstawy dobrych praktyk.'],
  ['Przygotowanie do matury', 'Powtórki materiału, arkusze i strategie egzaminacyjne.'],
];
const tutorDefinitions = [
  {
    first_name: 'Katarzyna',
    last_name: 'Zielińska',
    email: 'demo.tutor01@studyflow.local',
    experience: '6 lat doświadczenia',
    about_me: 'Pomagam uporządkować wiedzę i przygotować się do egzaminów.',
  },
  {
    first_name: 'Tomasz',
    last_name: 'Wójcik',
    email: 'demo.tutor02@studyflow.local',
    experience: '7 lat doświadczenia',
    about_me: 'Stawiam na praktyczne przykłady i indywidualne tempo nauki.',
  },
  {
    first_name: 'Aleksandra',
    last_name: 'Kamińska',
    email: 'demo.tutor03@studyflow.local',
    experience: '4 lata doświadczenia',
    about_me: 'Prowadzę spokojne, uporządkowane lekcje z regularną informacją zwrotną.',
  },
  {
    first_name: 'Michał',
    last_name: 'Lewandowski',
    email: 'demo.tutor04@studyflow.local',
    experience: '9 lat doświadczenia',
    about_me: 'Łączę teorię z zadaniami i praktycznymi zastosowaniami.',
  },
  {
    first_name: 'Natalia',
    last_name: 'Dąbrowska',
    email: 'demo.tutor05@studyflow.local',
    experience: '5 lat doświadczenia',
    about_me: 'Przygotowuję do sprawdzianów, egzaminów i matury.',
  },
];
const studentDefinitions = [
  ['Julia', 'Kaczmarek'],
  ['Filip', 'Mazur'],
  ['Zuzanna', 'Krawczyk'],
  ['Antoni', 'Piotrowski'],
  ['Maja', 'Grabowska'],
  ['Jakub', 'Pawlak'],
  ['Lena', 'Michalska'],
  ['Szymon', 'Król'],
  ['Amelia', 'Wieczorek'],
  ['Bartosz', 'Jabłoński'],
];
const dayNames = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
];
const lessonTimes = [
  ['09:00', '10:00'],
  ['11:00', '12:00'],
  ['14:00', '15:00'],
  ['17:00', '18:00'],
];

function dateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function slotFor(index) {
  const date = dateOffset(index < 25 ? -7 - index * 4 : 3 + (index - 25) * 3);
  const [start_time, end_time] = lessonTimes[index % lessonTimes.length];
  return { date, start_time, end_time };
}

function assertLocalDevelopmentDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Danych demonstracyjnych nie wolno dodawać w produkcji.');
  }
  if (process.env.SEED_DEMO_APPEND !== 'true') {
    throw new Error(
      'Aby potwierdzić dopisanie danych, ustaw SEED_DEMO_APPEND=true.',
    );
  }
  if (!process.env.DATABASE_URL?.startsWith('file:')) {
    throw new Error(
      'Skrypt dopisuje dane tylko do lokalnej bazy SQLite (DATABASE_URL=file:...).',
    );
  }
}

async function main() {
  assertLocalDevelopmentDatabase();

  const existingExpansion = await prisma.adminAuditLog.findFirst({
    where: {
      action: 'DEMO_DATA_EXPANSION',
      details: { contains: expansionKey },
    },
    select: { id_admin_audit_logs: true },
  });
  if (existingExpansion) {
    console.log(
      'Rozszerzony zestaw demo został już dodany. Nie wprowadzono zmian.',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const counts = await prisma.$transaction(
    async (tx) => {
      const [adminRole, tutorRole, studentRole] = await Promise.all([
        tx.role.findUniqueOrThrow({ where: { name: 'admin' } }),
        tx.role.findUniqueOrThrow({ where: { name: 'tutor' } }),
        tx.role.findUniqueOrThrow({ where: { name: 'student' } }),
      ]);
      const admin = await tx.user.findFirstOrThrow({
        where: { role_id: adminRole.id_roles },
        select: { id_users: true },
      });

      const subjects = [];
      for (const [name, description] of subjectDefinitions) {
        const subject =
          (await tx.subject.findFirst({ where: { name } })) ??
          (await tx.subject.create({ data: { name, description } }));
        subjects.push(subject);
      }

      const tutors = [];
      for (const [index, definition] of tutorDefinitions.entries()) {
        const tutor =
          (await tx.user.findUnique({ where: { email: definition.email } })) ??
          (await tx.user.create({
            data: {
              ...definition,
              password_hash: passwordHash,
              role_id: tutorRole.id_roles,
              phone: `+48 600 800 ${String(index + 1).padStart(3, '0')}`,
            },
          }));
        if (tutor.status !== 'ACTIVE') {
          throw new Error(
            `Konto demonstracyjne ${definition.email} istnieje, ale nie jest aktywne.`,
          );
        }
        tutors.push(tutor);
      }

      const students = [];
      for (const [index, [first_name, last_name]] of studentDefinitions.entries()) {
        const email = `demo.student${String(index + 1).padStart(2, '0')}@studyflow.local`;
        const student =
          (await tx.user.findUnique({ where: { email } })) ??
          (await tx.user.create({
            data: {
              first_name,
              last_name,
              email,
              password_hash: passwordHash,
              role_id: studentRole.id_roles,
              phone: `+48 700 800 ${String(index + 1).padStart(3, '0')}`,
            },
          }));
        if (student.status !== 'ACTIVE') {
          throw new Error(`Konto demonstracyjne ${email} nie jest aktywne.`);
        }
        students.push(student);
      }

      for (const tutor of tutors) {
        for (const day_of_week of dayNames) {
          const existing = await tx.availability.findFirst({
            where: {
              tutor_id: tutor.id_users,
              day_of_week,
              start_time: '08:00',
              end_time: '20:00',
            },
            select: { id_availability: true },
          });
          if (!existing) {
            await tx.availability.create({
              data: {
                tutor_id: tutor.id_users,
                day_of_week,
                start_time: '08:00',
                end_time: '20:00',
              },
            });
          }
        }
      }

      const offers = new Map();
      for (const [subjectIndex, subject] of subjects.entries()) {
        const tutor = tutors[subjectIndex % tutors.length];
        const offer = await tx.tutorSubject.findFirst({
          where: {
            tutor_id: tutor.id_users,
            subject_id: subject.id_subjects,
          },
        });
        const ensuredOffer =
          offer ??
          (await tx.tutorSubject.create({
            data: {
              tutor_id: tutor.id_users,
              subject_id: subject.id_subjects,
              price_per_hour: 55 + (subjectIndex % 6) * 10,
              experience_years: 2 + (subjectIndex % 8),
              description: 'Przykładowa oferta demonstracyjna.',
            },
          }));
        offers.set(subject.id_subjects, ensuredOffer);
      }

      const createdLessons = [];
      const createdBookings = [];
      for (let index = 0; index < 50; index += 1) {
        const subject = subjects[(index * 7) % subjects.length];
        const tutor = tutors[((index * 7) % subjects.length) % tutors.length];
        const student = students[index % students.length];
        const { date, start_time, end_time } = slotFor(index);
        const isPast = index < 25;
        const isBooked = isPast || index % 3 !== 0;
        const lesson = await tx.lesson.create({
          data: {
            tutor_id: tutor.id_users,
            subject_id: subject.id_subjects,
            lesson_date: date,
            start_time,
            end_time,
            status: isPast ? 'COMPLETED' : 'SCHEDULED',
            created_by: tutor.id_users,
            homework: isPast
              ? 'Powtórzyć materiał i przejrzeć rozwiązane zadania.'
              : null,
          },
        });
        createdLessons.push({ lesson, tutor, student, subject, isPast, isBooked });

        if (!isBooked) continue;
        const booking = await tx.booking.create({
          data: {
            lesson_id: lesson.id_lessons,
            student_id: student.id_users,
            status: 'CONFIRMED',
            note: 'Przykładowa rezerwacja demonstracyjna.',
          },
        });
        createdBookings.push(booking);

        if (isPast) {
          await tx.attendance.create({
            data: {
              booking_id: booking.id_bookings,
              present: index % 5 !== 0,
              marked_by: tutor.id_users,
            },
          });

          await tx.review.create({
            data: {
              student_id: student.id_users,
              tutor_id: tutor.id_users,
              lesson_id: lesson.id_lessons,
              rating: 3 + (index % 3),
              comment: [
                'Dobrze wyjaśniony temat i przyjazna atmosfera.',
                'Dużo praktycznych zadań, lekcja była pomocna.',
                'Jasne wyjaśnienia i dobre tempo pracy.',
              ][index % 3],
            },
          });

          const month = date.getUTCMonth() + 1;
          const year = date.getUTCFullYear();
          const gradeExists = await tx.monthlyGrade.findFirst({
            where: {
              student_id: student.id_users,
              subject_id: subject.id_subjects,
              month,
              year,
            },
            select: { id_monthly_grades: true },
          });
          if (!gradeExists) {
            await tx.monthlyGrade.create({
              data: {
                lesson_id: lesson.id_lessons,
                student_id: student.id_users,
                tutor_id: tutor.id_users,
                subject_id: subject.id_subjects,
                month,
                year,
                grade: 3.5 + (index % 4) * 0.5,
                comment: 'Systematyczna praca i widoczne postępy.',
              },
            });
          }
        }
      }

      const monthlyDetails = new Map();
      for (const item of createdLessons.filter((entry) => entry.isPast && entry.isBooked)) {
        const dateKey = `${item.lesson.lesson_date.getUTCFullYear()}-${String(
          item.lesson.lesson_date.getUTCMonth() + 1,
        ).padStart(2, '0')}`;
        const offer = offers.get(item.subject.id_subjects);
        const durationHours =
          (Number(item.lesson.end_time.slice(0, 2)) * 60 +
            Number(item.lesson.end_time.slice(3, 5)) -
            Number(item.lesson.start_time.slice(0, 2)) * 60 -
            Number(item.lesson.start_time.slice(3, 5))) /
          60;
        const hourlyRate = Number(offer.price_per_hour);
        const studentCost = durationHours * hourlyRate;
        const details = monthlyDetails.get(dateKey) ?? [];
        details.push({
          lesson_id: item.lesson.id_lessons,
          lesson_date: item.lesson.lesson_date.toISOString().slice(0, 10),
          start_time: item.lesson.start_time,
          end_time: item.lesson.end_time,
          subject: item.subject.name,
          tutor: `${item.tutor.first_name} ${item.tutor.last_name}`,
          student: `${item.student.first_name} ${item.student.last_name}`,
          duration_hours: durationHours,
          hourly_rate: hourlyRate,
          student_cost: studentCost,
          tutor_salary: studentCost * 0.8,
        });
        monthlyDetails.set(dateKey, details);
      }

      let reportsCreated = 0;
      for (const [period, details] of monthlyDetails) {
        const [yearText, monthText] = period.split('-');
        const year = Number(yearText);
        const month = Number(monthText);
        const existing = await tx.financialReport.findFirst({
          where: { year, month },
          select: { id_financial_reports: true },
        });
        if (existing) continue;
        const totalStudentCost = details.reduce(
          (total, detail) => total + detail.student_cost,
          0,
        );
        await tx.financialReport.create({
          data: {
            month,
            year,
            generated_by_user_id: admin.id_users,
            total_student_cost: Math.round(totalStudentCost * 100) / 100,
            total_tutor_salary:
              Math.round(totalStudentCost * 0.8 * 100) / 100,
            details: JSON.stringify(details),
          },
        });
        reportsCreated += 1;
      }

      const requests = [
        ['Fizyka atomowa', 'Przykładowe zgłoszenie nowego przedmiotu do weryfikacji.'],
        ['Podstawy rachunkowości', 'Zajęcia wprowadzające do rachunkowości.'],
        ['Język włoski', 'Konwersacje i podstawy gramatyki.'],
      ];
      let requestsCreated = 0;
      for (const [index, [subject_name, description]] of requests.entries()) {
        const tutor = tutors[index];
        const exists = await tx.subjectRequest.findFirst({
          where: { tutor_id: tutor.id_users, subject_name },
          select: { id_subject_requests: true },
        });
        if (exists) continue;
        await tx.subjectRequest.create({
          data: { tutor_id: tutor.id_users, subject_name, description },
        });
        requestsCreated += 1;
      }

      let issuesCreated = 0;
      for (const item of createdLessons.filter((entry) => entry.isPast).slice(0, 3)) {
        const reporterId = item.student.id_users;
        const title = 'Przykładowe pytanie dotyczące przebiegu lekcji';
        const exists = await tx.lessonIssue.findFirst({
          where: {
            lesson_id: item.lesson.id_lessons,
            reporter_id: reporterId,
            title,
          },
          select: { id_lesson_issues: true },
        });
        if (exists) continue;
        const issue = await tx.lessonIssue.create({
          data: {
            lesson_id: item.lesson.id_lessons,
            reporter_id: reporterId,
            title,
            description:
              'To demonstracyjne zgłoszenie służy do sprawdzenia kolejki administratora. Nie wymaga rzeczywistej interwencji.',
            status: issuesCreated === 0 ? 'OPEN' : 'IN_PROGRESS',
          },
        });
        await tx.notification.create({
          data: {
            user_id: admin.id_users,
            title: 'Demonstracyjne zgłoszenie lekcji',
            message: `Dodano przykładowe zgłoszenie: ${issue.title}.`,
            type: 'ADMIN_LESSON_ISSUE',
          },
        });
        issuesCreated += 1;
      }

      await tx.adminAuditLog.create({
        data: {
          actor_id: admin.id_users,
          action: 'DEMO_DATA_EXPANSION',
          entity_type: 'demo_data',
          details: JSON.stringify({
            key: expansionKey,
            subjectsAddedOrReused: subjects.length,
            demoTutors: tutors.length,
            demoStudents: students.length,
            lessonsAdded: createdLessons.length,
            bookingsAdded: createdBookings.length,
            financialReportsAdded: reportsCreated,
            subjectRequestsAdded: requestsCreated,
            lessonIssuesAdded: issuesCreated,
          }),
        },
      });

      return {
        subjects: subjects.length,
        tutors: tutors.length,
        students: students.length,
        lessons: createdLessons.length,
        pastLessons: createdLessons.filter((item) => item.isPast).length,
        upcomingLessons: createdLessons.filter((item) => !item.isPast).length,
        bookings: createdBookings.length,
        reports: reportsCreated,
        requests: requestsCreated,
        issues: issuesCreated,
      };
    },
    { maxWait: 15000, timeout: 120000 },
  );

  console.log('Dodano rozszerzony zestaw danych demonstracyjnych.');
  console.log(JSON.stringify(counts, null, 2));
  console.log(
    `Konta demo: demo.tutor01–05@studyflow.local oraz demo.student01–10@studyflow.local. Hasło lokalne: ${demoPassword}.`,
  );
  console.log('Nie używaj tych kont ani hasła na wdrożeniu produkcyjnym.');
}

main()
  .catch((error) => {
    console.error(
      'Nie udało się dodać danych demonstracyjnych:',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
