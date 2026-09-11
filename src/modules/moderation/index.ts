import { Context, MiddlewareFn } from 'telegraf';
import { prisma } from '../../database.js';

const linkPattern = /(?:https?:\/\/|t\.me\/|www\.)/i;

export const moderation: MiddlewareFn<Context> = async (ctx, next) => {
  if (ctx.chat?.type === 'private' || !ctx.message || !('text' in ctx.message)) return next();
  const text = ctx.message.text;
  if (!linkPattern.test(text)) return next();
  const admins = await ctx.getChatAdministrators();
  if (admins.some((admin) => admin.user.id === ctx.from?.id)) return next();
  try {
    await ctx.deleteMessage();
    await ctx.sendMessage('تم حذف رابط غير مسموح به.');
    const group = await prisma.group.upsert({
      where: { telegramChatId: BigInt(ctx.chat.id) },
      update: {},
      create: { telegramChatId: BigInt(ctx.chat.id), title: 'title' in ctx.chat ? ctx.chat.title : 'مجموعة' },
    });
    await prisma.moderationLog.create({ data: { groupId: group.id, action: 'DELETE', targetTelegramId: BigInt(ctx.from!.id), reason: 'رابط غير مسموح' } });
  } catch {
    await ctx.reply('أحتاج صلاحية حذف الرسائل لتفعيل فلترة الروابط.');
  }
};
