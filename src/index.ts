import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { prisma } from './database.js';
import { mainMenu } from './bot/keyboards.js';
import { listNotes } from './modules/notes/index.js';
import { listCamps } from './modules/camps/index.js';
import { moderation } from './modules/moderation/index.js';

const bot = new Telegraf(config.token);

bot.use(async (ctx, next) => {
  if (ctx.from) {
    await prisma.user.upsert({
      where: { telegramId: BigInt(ctx.from.id) },
      update: { name: ctx.from.first_name, username: ctx.from.username },
      create: { telegramId: BigInt(ctx.from.id), name: ctx.from.first_name, username: ctx.from.username, role: config.ownerTelegramId === BigInt(ctx.from.id) ? 'OWNER' : 'STUDENT' },
    });
  }
  return next();
});

bot.use(moderation);

bot.start((ctx) => ctx.reply('أهلاً بك في البوت الدراسي ✨\nاختر الخدمة التي تريدها:', mainMenu()));
bot.command('help', (ctx) => ctx.reply('استخدم الأزرار للوصول إلى المعسكرات والملاحظات.'));
bot.action('notes:list', async (ctx) => { await ctx.answerCbQuery(); await listNotes(ctx); });
bot.action('camps:list', async (ctx) => { await ctx.answerCbQuery(); await listCamps(ctx); });
bot.action('notes:new', async (ctx) => { await ctx.answerCbQuery(); await ctx.reply('أرسل الآن نص الملاحظة.'); });
bot.action('help', async (ctx) => { await ctx.answerCbQuery(); await ctx.reply('المعسكرات مجانية للفئات المحددة، والملاحظات خاصة بك.'); });

bot.on('text', async (ctx) => {
  if (ctx.chat.type !== 'private' || ctx.message.text.startsWith('/')) return;
  const user = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(ctx.from.id) } });
  await prisma.stickyNote.create({ data: { userId: user.id, content: ctx.message.text } });
  await ctx.reply('تم حفظ الملاحظة ✅', mainMenu());
});

bot.catch((error) => console.error('Bot error:', error));
bot.launch().then(() => console.log('البوت يعمل بنجاح'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
