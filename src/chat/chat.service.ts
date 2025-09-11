// src/chat/chat.service.ts
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { LeaveBalance } from './entities/leave-balance.entity';
import { Benefit } from './entities/benefit.entity';

function daysToHours(days: number, hoursPerDay = 8.5): string {
  const totalHours = days * hoursPerDay;
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  return `${h} ชั่วโมง ${m} นาที`;
}

@Injectable()
export class ChatService {
  private llm?: ChatGoogleGenerativeAI;

  constructor(
    @Optional() private readonly config?: ConfigService,
    @Optional()
    @InjectRepository(LeaveBalance)
    private readonly leaveRepo?: Repository<LeaveBalance>,
    @Optional()
    @InjectRepository(Benefit)
    private readonly benefitRepo?: Repository<Benefit>,
  ) {}

  private isThai(text: string): boolean {
    return /[\u0E00-\u0E7F]/.test(text);
  }

  // Determine if a question is within our supported HR scope
  // Keep it lightweight: keyword-based in TH/EN for leave/benefits/CNEXT/HR
  private isInScope(question: string): boolean {
    const q = question.toLowerCase();

    // English keywords
    const en = [
      'leave',
      'vacation',
      'annual leave',
      'sick leave',
      'personal leave',
      'time off',
      'holiday',
      'benefit',
      'benefits',
      'medical',
      'dental',
      'insurance',
      'ipd',
      'opd',
      'claim',
      'policy',
      'payroll',
      'salary',
      'overtime',
      'attendance',
      'timesheet',
      'shift',
      'cnext',
      'peoplecare',
      'hr',
      'credit limit',
    ];

    // Thai keywords (case-insensitive is fine for Thai by direct includes)
    const th = [
      'ลางาน',
      'ลากิจ',
      'ลาป่วย',
      'วันหยุด',
      'สิทธิ',
      'สิทธิ์',
      'สวัสดิการ',
      'ประกัน',
      'ค่ารักษา',
      'ทันตกรรม',
      'เบิก',
      'วงเงิน',
      'เครดิต',
      'นโยบาย',
      'เงินเดือน',
      'โอที',
      'ลงเวลา',
      'เข้างาน',
      'ออกงาน',
      'กะ',
      'เวลางาน',
      'cnext',
      'peoplecare',
      'ฝ่ายบุคคล',
      'ทรัพยากรบุคคล',
    ];

    const hasEn = en.some((k) => q.includes(k));
    // For Thai, check on original string to avoid losing characters
    const hasTh = th.some((k) => question.includes(k));

    return hasEn || hasTh;
  }

  private getEscalationMessage(lang: 'Thai' | 'English'): string {
    if (lang === 'Thai') {
      return `โอ๊ยตาย! เรื่องนี้ป้าเองก็ตอบไม่ได้จริง ๆ จ้ะลูก
ถ้าเจอปัญหาเกี่ยวกับระบบ CNEXT นะ หลานสามารถเปิดตั๋วคำร้อง (Ticket) ได้เลย
แนบรูปภาพที่เจอปัญหา พร้อมชื่อ-นามสกุลกับรหัสพนักงานไปด้วยนะ จะได้ตรวจสอบง่าย ๆ

ส่งอีเมลไปที่ PeopleCare@central.co.th
หรือโทร 02-100-6789 แล้วกด 7 ตามด้วยกด 3
(เวลาทำการ จันทร์–ศุกร์ 08:30–18:00 ยกเว้นวันหยุดนักขัตฤกษ์)

รับรองว่า PEOPLE CARE จะรีบช่วยดูให้จ้ะ 😉`;
    } else {
      return `Oh dear! Auntie can’t help with this one, my love.
If you face issues with the CNEXT system, you can open a ticket.
Attach a screenshot of the problem along with your full name and employee ID.

Send an email to PeopleCare@central.co.th
Or call +66-2-100-6789, press 7 then 3
(Working hours: Mon–Fri, 08:30–18:00, excluding public holidays).

Don’t worry, PEOPLE CARE will take good care of you 😉`;
    }
  }

  private num(v: string | number | null | undefined): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private fmt(n: number | null): string {
    if (n === null) return '-';
    return n % 1 === 0
      ? n.toString()
      : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  private async buildContext(employeeId: string | undefined): Promise<string> {
    if (!employeeId) return 'No employee-specific data available.';
    if (!this.leaveRepo || !this.benefitRepo)
      return 'No employee-specific data available.';

    const [leaves, benefit] = await Promise.all([
      this.leaveRepo.find({ where: { employeeId } }),
      this.benefitRepo.findOne({ where: { employeeId } }),
    ]);

    const leaveParts: string[] = [];
    if (leaves.length > 0) {
      const byType: Record<
        string,
        { accrued: number; used: number; end: number }
      > = {};

      for (const l of leaves) {
        byType[l.accrualBank] = {
          accrued: this.num(l.accrued) ?? 0,
          used: this.num(l.used) ?? 0,
          end: this.num(l.endingBalance) ?? 0,
        };
      }

      const preferredOrder = ['Annual', 'Sick', 'Personal'];
      const allTypes = [...preferredOrder, ...Object.keys(byType)];

      for (const t of allTypes) {
        if (!(t in byType)) continue;
        const { accrued, used, end } = byType[t];
        leaveParts.push(
          `${t} Leave: ${this.fmt(accrued)} days total, ` +
            `${this.fmt(used)} days used, ` +
            `${this.fmt(end)} days left (${daysToHours(end)})`,
        );
      }
    }

    const benefitParts: string[] = [];
    if (benefit) {
      const ipd = this.num(benefit.ipdRoom ?? null);
      const medBal = this.num(benefit.medBalance ?? null);
      const denBal = this.num(benefit.denBalance ?? null);
      const medAccu = this.num(benefit.medAccu ?? null);
      const denAccu = this.num(benefit.denAccu ?? null);
      const maxCredit = this.num(benefit.maxCredit ?? null);

      const summary: string[] = [];
      if (ipd !== null) summary.push(`IPD Room ${this.fmt(ipd)}`);
      if (medBal !== null)
        summary.push(`Remaining Medical ${this.fmt(medBal)}`);
      if (denBal !== null) summary.push(`Remaining Dental ${this.fmt(denBal)}`);
      if (medAccu !== null) summary.push(`Medical used ${this.fmt(medAccu)}`);
      if (denAccu !== null) summary.push(`Dental used ${this.fmt(denAccu)}`);
      if (maxCredit !== null) summary.push(`Max Credit ${this.fmt(maxCredit)}`);

      if (summary.length) benefitParts.push(`Benefits: ${summary.join(', ')}`);
    }

    const pieces: string[] = [];
    if (leaveParts.length) pieces.push(leaveParts.join('. '));
    if (benefitParts.length) pieces.push(benefitParts.join('. '));

    return `Employee ${employeeId} has ${pieces.join('. ')}.`;
  }
  

  async ask(question: string, employeeId?: string): Promise<string> {
    const lang = this.isThai(question) ? 'Thai' : 'English';

    // Out-of-scope questions should escalate immediately
    if (!this.isInScope(question)) {
      return this.getEscalationMessage(lang);
    }

    const context = await this.buildContext(employeeId);

    // หากไม่มีข้อมูลพนักงานใน DB ให้ตอบข้อความ escalation ทันที
    if (context === 'No employee-specific data available.') {
      return this.getEscalationMessage(lang);
    }
    if (!context || context.includes('No employee-specific data')) {
      return this.getEscalationMessage(lang);
    }

    if (!this.llm) {
      const apiKey =
        this.config?.get<string>('GEMINI_API_KEY') ??
        process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return this.getEscalationMessage(lang);
      }
      this.llm = new ChatGoogleGenerativeAI({
        model: 'gemini-2.0-flash-lite',
        apiKey,
        temperature: 0.3,
      });
    }

    const prompt = [
      'You are "ป้าข้างบ้าน Chatbot", an HR Virtual Assistant.',
      'Personality: Friendly, gossip-style auntie, slightly sassy but helpful.',
      'Always act like a neighbor gossiping but helpful.',
      `IMPORTANT: User asked in **${lang}**, so you MUST reply in ${lang} only.`,
      'Do not mix languages.',
      '❌ Do not use markdown lists, bullets, or bold text.',
      '✅ Write as natural chatty sentences with line breaks only.',
      'If you don’t know:',
      ` ${this.getEscalationMessage(lang)}`,
      '',
      `CONTEXT: ${context}`,
      '',
      `QUESTION: ${question}`,
      '',
      `ANSWER (in ${lang}, gossip auntie style):`,
    ].join('\n');

    try {
      const res = await this.llm.invoke([new HumanMessage(prompt)]);
      const contentUnknown: unknown = (res as { content: unknown }).content;
      let text = '';
      if (typeof contentUnknown === 'string') {
        text = contentUnknown;
      } else if (Array.isArray(contentUnknown)) {
        text = (contentUnknown as any[])
          .map((p) => (typeof p === 'string' ? p : ((p as any).text ?? '')))
          .join('')
          .trim();
      }

      if (!text) {
        return this.getEscalationMessage(lang);
      }
      if (text.startsWith('CONTEXT')) {
        text = this.isThai(question)
          ? 'ป้าเล่าให้ฟังแบบง่าย ๆ เลยนะลูก: ' +
            text.replace(/^CONTEXT.*?:/i, '').trim()
          : 'Let me explain simply, dear: ' +
            text.replace(/^CONTEXT.*?:/i, '').trim();
      }
      return text;
    } catch (_) {
      return this.getEscalationMessage(lang);
    }
  }
}
