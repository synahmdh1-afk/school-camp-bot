import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Telegraf(token);
const prisma = new PrismaClient();

const OWNER_ID = parseInt(process.env.OWNER_ID || '0');

// تسجيل المستخدمين تلقائياً
bot.use(async (ctx, next) => {
    if (ctx.from) {
        try {
            await prisma.user.upsert({
                where: { id: BigInt(ctx.from.id) },
                update: {
                    name: ctx.from.first_name,
                    username: ctx.from.username || null,
                },
                create: {
                    id: BigInt(ctx.from.id),
                    name: ctx.from.first_name,
                    username: ctx.from.username || null,
                    role: ctx.from.id === OWNER_ID ? 'OWNER' : 'USER',
                },
            });
        } catch (error) {
            console.error('Error saving user:', error);
        }
    }
    return next();
});

// أمر /start
bot.command('start', async (ctx) => {
    let userRole = 'USER';
    try {
        const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from.id) } });
        if (user) userRole = user.role;
    } catch (e) { console.error(e); }

    const buttons = [
        [Markup.button.callback('📚 أقسام المذاكرة', 'menu_sections')],
        [Markup.button.callback('🏕️ Camp Pro', 'camp_pro_menu')],
    ];

    // إظهار لوحة المطور للمالك أو الأدمن فقط
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
        buttons.push([Markup.button.callback('👨‍💻 لوحة المطور', 'admin_panel')]);
    }

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.reply(أهلاً بك يا ${ctx.from.first_name} في بوت ثانوية الدراسي! 🎓, keyboard);
});

// لوحة المطور
bot.action('admin_panel', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from!.id) } });
    
    if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') {
        return ctx.answerCbQuery('❌ ليس لديك صلاحية لدخول لوحة المطور.', { show_alert: true });
    }

    const adminButtons = [
        [Markup.button.callback('📋 إدارة المحتوى', 'admin_content'), Markup.button.callback('👥 المستخدمون', 'admin_users')],
        [Markup.button.callback('📢 الإعلانات', 'admin_ads'), Markup.button.callback('👨‍💼 الصلاحيات', 'admin_roles')],
        [Markup.button.callback('🗑️ سلة المحذوفات', 'admin_trash'), Markup.button.callback('⚙️ الإعدادات', 'admin_settings')]
    ];

    await ctx.editMessageText('👨‍💻 لوحة المطور\nأهلاً بك في لوحة التحكم. اختر القسم المراد إدارته:', 
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(adminButtons) }
    );
});

bot.launch().then(() => {
    console.log('🤖 Bot is running...');
}).catch((err) => {
    console.error('Error starting bot:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
