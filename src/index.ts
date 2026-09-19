import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// استدعاء الأنظمة
import { setupMenuModule } from './modules/menu';
import { getAdminPanelKeyboard, getContentManagementKeyboard } from './modules/admin';
import { setupButtonManager } from './modules/button_manager'; // 👈 الموديول الجديد

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN must be provided!");

const bot = new Telegraf(token);
const prisma = new PrismaClient();
const OWNER_ID = parseInt(process.env.OWNER_ID || "0");

bot.use(async (ctx, next) => {
    if (ctx.from) {
        try {
            await prisma.user.upsert({
                where: { id: BigInt(ctx.from.id) },
                update: { name: ctx.from.first_name, username: ctx.from.username || null },
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

// تشغيل الأنظمة
const { buildDynamicKeyboard } = setupMenuModule(bot, prisma);
setupButtonManager(bot, prisma); // 👈 تشغيل نظام إضافة الأزرار

bot.command("start", async (ctx) => {
    let welcomeSetting = await prisma.setting.findUnique({ where: { key: "welcome_message" } });
    let welcomeText = welcomeSetting?.value || "أهلاً بك يا {name} في بوت ثانوية الدراسي! 🎓\nاختر من القائمة أدناه:";
    welcomeText = welcomeText.replace(/{name}/g, ctx.from.first_name);

    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from.id) } });
    const keyboard = await buildDynamicKeyboard(null);

    if (user && (user.role === "OWNER" || user.role === "ADMIN")) {
        keyboard.reply_markup.inline_keyboard.push([
            Markup.button.callback("👨‍💻 لوحة المطور", "admin_panel")
        ]);
    }

    await ctx.reply(welcomeText, keyboard);
});

bot.action("admin_panel", async (ctx) => {
    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from!.id) } });
    if (user?.role !== "OWNER" && user?.role !== "ADMIN") return;

    const adminKeyboard = getAdminPanelKeyboard(true, true);
    adminKeyboard.reply_markup.inline_keyboard.push([
        Markup.button.callback("🔙 رجوع للقائمة الرئيسية", "main_menu")
    ]);

    await ctx.editMessageText("👨‍💻 لوحة المطور\nأهلاً بك يا هندسة. اختر القسم المراد إدارته:", adminKeyboard);
});

bot.action("admin_content", async (ctx) => {
    const contentKeyboard = getContentManagementKeyboard();
    await ctx.editMessageText("إدارة رسائل البوت والردود التلقائية", contentKeyboard);
});

// تم إزالة زرار (تعديل الأزرار) من هنا عشان يشتغل بجد
const emptyAdminButtons = [
    "admin_settings", "admin_users", "admin_camps", "admin_ads", 
    "admin_trash", "admin_system_support", "toggle_login_notif", 
    "toggle_block_notif", "admin_guide", "admin_groups",
    "admin_welcome_msg", "admin_auto_replies", 
    "admin_transparent_buttons", "admin_shortcuts", "admin_edits_list", 
    "admin_edit_content", "admin_deep_link", "admin_translation", 
    "admin_bot_info", "admin_help"
];

bot.action(emptyAdminButtons, async (ctx) => {
    await ctx.answerCbQuery("⏳ هذا القسم قيد التطوير يا هندسة، هنبرمجه قريباً!", { show_alert: true });
});

bot.launch().then(() => console.log("🤖 Bot is running..."))
.catch((err) => console.error("Error starting bot:", err));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
