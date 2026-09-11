import { Context } from 'telegraf';
import { prisma } from '../../database.js';

export async function listNotes(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
  if (!user) return ctx.reply('ليس لديك ملاحظات بعد. اضغط «ملاحظة جديدة».');
  const notes = await prisma.stickyNote.findMany({ where: { userId: user.id, isDone: false }, orderBy: { createdAt: 'desc' }, take: 10 });
  if (!notes.length) return ctx.reply('ليس لديك ملاحظات نشطة.');
  return ctx.reply(notes.map((note, i) => `${i + 1}. ${note.content}${note.subject ? ` — ${note.subject}` : ''}`).join('\n'));
}
