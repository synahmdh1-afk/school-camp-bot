import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// استدعاء الأنظمة اللي جهزناها في فولدر modules
import { setupMenuModule } from './modules/menu';
import { getAdminPanelKeyboard } from './modules/admin';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN must be provided!");

const bot = new Telegraf(token);
const prisma = new PrismaClient();
const OWNER_ID = parseInt(process.env.OWNER_ID || "0");

// 1. تسجيل المستخدمين في قاعدة البيانات أوتوماتيك
bot.use(async (ctx, next) => {
    if (ctx.from) {
        try {
            await prisma.user.upsert({
                where: { id: BigInt(ctx.from.id) },
                update: { 
                    name: ctx.from.first_name, 
                    username: ctx.from.username || null 
                },
                create: {
                    id: BigInt(ctx.from.id),
                    name: ctx.from.first_name,
                    username: ctx.from.username || null,
                    role: ctx.from.id === OWNER_ID ? "OWNER" : "USER",
                },
            });
        } catch (error) {
            console.error("Error saving user:", error);
        }
    }
    return next();
});

// 2. تشغيل نظام القائمة الديناميكية السحري
const { buildDynamicKeyboard } = setupMenuModule(bot, prisma);

// 3. أمر البداية /start
bot.command("start", async (ctx) => {
    // نجيب رسالة الترحيب من الداتا بيز
    let welcomeSetting = await prisma.setting.findUnique({ where: { key: "welcome_message" } });
    let welcomeText = welcomeSetting?.value || "أهلاً بك يا {name} في بوت ثانوية الدراسي! 🎓\nاختر من القائمة أدناه:";
    welcomeText = welcomeText.replace(/{name}/g, ctx.from.first_name);

    // نجيب صلاحيات المستخدم
    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from.id) } });
    
    // نجيب الزراير الديناميكية اللي المطور ضافها
    const keyboard = await buildDynamicKeyboard(null);

    // لو المستخدم هو المالك أو أدمن، نضيفله زرار لوحة المطور تحت الزراير الأساسية
    if (user && (user.role === "OWNER" || user.role === "ADMIN")) {
        keyboard.reply_markup.inline_keyboard.push([
            Markup.button.callback("👨‍💻 لوحة المطور", "admin_panel")
        ]);
    }

    await ctx.reply(welcomeText, keyboard);
});

// 4. فتح لوحة المطور
bot.action("admin_panel", async (ctx) => {
    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from!.id) } });

    if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
        return ctx.answerCbQuery("❌ ليس لديك صلاحية لدخول لوحة المطور.", { show_alert: true });
    }

    // استدعاء اللوحة الاحترافية اللي برمجناها (مؤقتاً الإشعارات شغالة بـ true)
    const adminKeyboard = getAdminPanelKeyboard(true, true);
    
    // إضافة زرار للرجوع للقائمة الرئيسية
    adminKeyboard.reply_markup.inline_keyboard.push([
        Markup.button.callback("🔙 رجوع للقائمة الرئيسية", "main_menu")
    ]);

    await ctx.editMessageText("👨‍💻 لوحة المطور\nأهلاً بك يا هندسة. اختر القسم المراد إدارته:", adminKeyboard);
});

// 5. تشغيل البوت
bot.launch().then(() => {
    console.log("🤖 Bot is running...");
}).catch((err) => console.error("Error starting bot:", err));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
