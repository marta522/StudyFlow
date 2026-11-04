process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'file:./e2e-test.db';
process.env.JWT_SECRET ??=
  'studyflow-e2e-test-secret-with-at-least-32-characters';
process.env.TUTOR_SALARY_PERCENT ??= '80';
