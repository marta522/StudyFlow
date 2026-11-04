import { PrismaService } from '../prisma/prisma.service';
import { getLessonEnd, todayInAppTimezone } from './timezone';

type LessonCompletionStore = Pick<PrismaService, 'lesson'>;

export async function completePastLessons(
  prisma: LessonCompletionStore,
  now: Date = new Date(),
): Promise<number> {
  const today = todayInAppTimezone(now);
  const olderLessons = await prisma.lesson.updateMany({
    where: { status: 'SCHEDULED', lesson_date: { lt: today } },
    data: { status: 'COMPLETED' },
  });
  const todayLessons = await prisma.lesson.findMany({
    where: { status: 'SCHEDULED', lesson_date: today },
    select: { id_lessons: true, lesson_date: true, end_time: true },
  });
  const endedLessonIds = todayLessons
    .filter(
      (lesson) =>
        getLessonEnd(lesson.lesson_date, lesson.end_time).getTime() <=
        now.getTime(),
    )
    .map((lesson) => lesson.id_lessons);

  if (endedLessonIds.length === 0) return olderLessons.count;

  const completedToday = await prisma.lesson.updateMany({
    where: {
      id_lessons: { in: endedLessonIds },
      status: 'SCHEDULED',
    },
    data: { status: 'COMPLETED' },
  });
  return olderLessons.count + completedToday.count;
}
