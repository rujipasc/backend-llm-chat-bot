import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerCustomService {
  constructor(private readonly mailer: MailerService) {}

  async sendMagicLink(
    email: string,
    employeeId: string,
    link: string,
    ttl: number,
  ) {
    await this.mailer.sendMail({
      to: email,
      subject: '🔑 HR Chatbot Login Link',
      template: 'magic-link', // อ้างถึงไฟล์ magic-link.hbs ใน templates dir
      context: {
        name: email,
        employeeId,
        link,
        ttl,
      },
    });
  }
}
