import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  function makeDto(overrides: Partial<RegisterDto> = {}) {
    return Object.assign(new RegisterDto(), {
      first_name: 'Anna',
      last_name: 'Kowalska',
      email: 'anna@example.com',
      password: 'strongpass123',
      role: 'student',
      ...overrides,
    });
  }

  it('rejects whitespace-only names and values exceeding stored field limits', async () => {
    const errors = await validate(
      makeDto({
        first_name: '   ',
        last_name: 'K'.repeat(46),
        email: `${'a'.repeat(90)}@example.com`,
        phone: '1'.repeat(46),
      }),
    );
    const invalidProperties = errors.map(({ property }) => property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['first_name', 'last_name', 'email', 'phone']),
    );
  });

  it('accepts a valid registration payload', async () => {
    await expect(validate(makeDto())).resolves.toHaveLength(0);
  });
});
