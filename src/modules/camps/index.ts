import { Context } from 'telegraf';
import { prisma } from '../../database.js';

export async function listCamps(ctx: Context) {
  const camps = await prisma.camp.findMany({ where: { isPublished: true }, orderBy: { startsAt: 'asc' } });
  if (!camps.length) return ctx.reply('لا توجد معسكرات منشورة حالياً. تابعنا قريباً ✨');
  return ctx.reply(camps.map((camp, i) => `${i + 1}. ${camp.title}\n📅 يبدأ: ${camp.startsAt.toLocaleDateString('ar-EG')}`).join('\n\n'));
}
