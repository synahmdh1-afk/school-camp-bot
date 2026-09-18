import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error("BOT_TOKEN must be provided!");
}

const bot = new Telegraf(token);
const prisma = new PrismaClient();

const OWNER_ID = parseInt(process.env.OWNER_ID || "0");

// تسجيل المستخدم في قاعدة البيانات
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
                    role: ctx.from.id === OWNER_ID ? "OWNER" : "USER",
                },
            });
        } catch (error) {
            console.error("Error saving user:", error);
        }
    }
    return next();
});

// دالة القائمة الرئيسية عشان نستخدمها في الاستدعاء والرجوع
async function getMainMenuKeyboard(userId: number) {
    let userRole = "USER";
    try {
        const user = await prisma.user.findUnique({ where: { id: BigInt(userId) } });
        if (user) userRole = user.role;
    } catch (e) {
        console.error(e);
    }

    const buttons = [
        [Markup.button.callback("📚 أقسام المذاكرة", "menu_sections")],
        [Markup.button.callback("🏕️ Camp Pro", "camp_pro_menu")]
    ];

    if (userRole === "OWNER" || userRole === "ADMIN") {
        buttons.push([Markup.button.callback("👨‍💻 لوحة المطور", "admin_panel")]);
    }

    return Markup.inlineKeyboard(buttons);
}

// أمر البداية /start
bot.command("start", async (ctx) => {
    const keyboard = await getMainMenuKeyboard(ctx.from.id);
    const welcomeMessage = `أهلاً بك يا ${ctx.from.first_name} في بوت ثانوية الدراسي! 🎓\nاختر من القائمة أدناه:`;
    
    await ctx.reply(welcomeMessage, keyboard);
});

// --- أوامر أزرار المستخدمين ---

// زرار أقسام المذاكرة
bot.action("menu_sections", async (ctx) => {
    const buttons = [
        [Markup.button.callback("الصف الأول الثانوي", "grade_1"), Markup.button.callback("الصف الثاني الثانوي", "grade_2")],
        [Markup.button.callback("الصف الثالث الثانوي", "grade_3")],
        [Markup.button.callback("🔙 رجوع", "main_menu")]
    ];
    await ctx.editMessageText("📚 أقسام المذاكرة:\nاختر الصف الدراسي الخاص بك:", Markup.inlineKeyboard(buttons));
});

// زرار الكامب
bot.action("camp_pro_menu", async (ctx) => {
    const buttons = [
        [Markup.button.callback("ℹ️ تفاصيل المعسكر", "camp_info"), Markup.button.callback("✅ الاشتراك", "camp_sub")],
        [Markup.button.callback("🔙 رجوع", "main_menu")]
    ];
    await ctx.editMessageText("🏕️ قسم Camp Pro:\nهنا يمكنك الانضمام للمعسكرات الدراسية والمتابعة مع المدرسين.", Markup.inlineKeyboard(buttons));
});

// زرار الرجوع للقائمة الرئيسية
bot.action("main_menu", async (ctx) => {
    const keyboard = await getMainMenuKeyboard(ctx.from!.id);
    await ctx.editMessageText("🏠 القائمة الرئيسية:\nاختر من القائمة أدناه:", keyboard);
});

// أزرار فرعية مؤقتة (عشان ميفضلش يحمل)
bot.action(["grade_1", "grade_2", "grade_3", "camp_info", "camp_sub"], (ctx) => {
    ctx.answerCbQuery("⏳ هذا القسم قيد التطوير وسيتم إضافته قريباً!", { show_alert: true });
});


// --- أوامر لوحة المطور ---

bot.action("admin_panel", async (ctx) => {
    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from!.id) } });

    if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
        return ctx.answerCbQuery("❌ ليس لديك صلاحية لدخول لوحة المطور.", { show_alert: true });
    }

    const adminButtons = [
        [Markup.button.callback("📋 إدارة المحتوى", "admin_content"), Markup.button.callback("👥 المستخدمون", "admin_users")],
        [Markup.button.callback("📢 الإعلانات", "admin_ads"), Markup.button.callback("👨‍💼 الصلاحيات", "admin_roles")],
        [Markup.button.callback("🗑️ سلة المحذوفات", "admin_trash"), Markup.button.callback("⚙️ الإعدادات", "admin_settings")],
        [Markup.button.callback("🔙 رجوع للقائمة الرئيسية", "main_menu")]
    ];

    const adminMessage = "👨‍💻 لوحة المطور\nأهلاً بك في لوحة التحكم يا هندسة. اختر القسم المراد إدارته:";
    await ctx.editMessageText(adminMessage, Markup.inlineKeyboard(adminButtons));
});

// ردود مؤقتة لزراير الإدمن عشان متهنجش
bot.action(["admin_content", "admin_users", "admin_ads", "admin_roles", "admin_trash", "admin_settings"], (ctx) => {
    ctx.answerCbQuery("⚙️ الميزة دي لسه بتتبرمج يا هندسة!", { show_alert: true });
});

bot.launch().then(() => {
    console.log("🤖 Bot is running...");
}).catch((err) => {
    console.error("Error starting bot:", err);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
