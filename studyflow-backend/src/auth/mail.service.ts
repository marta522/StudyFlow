import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  assertConfigured() {
    const required = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM',
      'FRONTEND_URL',
    ] as const;
    const missing = required.filter((key) => !this.config.get<string>(key));
    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        'Odzyskiwanie hasła jest chwilowo niedostępne. Administrator musi skonfigurować usługę pocztową.',
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    this.assertConfigured();
    const port = Number(this.config.getOrThrow<string>('SMTP_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException(
        'Nieprawidłowa konfiguracja portu usługi pocztowej.',
      );
    }

    const frontendUrl = this.config
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/+$/, '');
    const resetUrl = new URL('/reset-password', `${frontendUrl}/`);
    resetUrl.searchParams.set('token', token);
    const transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });

    await transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: email,
      subject: 'Resetowanie hasła StudyFlow',
      text: `Otrzymaliśmy prośbę o zmianę hasła. Link jest ważny przez 30 minut: ${resetUrl.toString()}\n\nJeśli to nie Ty wysłałeś prośbę, zignoruj tę wiadomość.`,
      html: `<p>Otrzymaliśmy prośbę o zmianę hasła.</p><p><a href="${resetUrl.toString()}">Ustaw nowe hasło</a></p><p>Link jest ważny przez 30 minut. Jeśli to nie Ty wysłałeś prośbę, zignoruj tę wiadomość.</p>`,
    });
  }
}
