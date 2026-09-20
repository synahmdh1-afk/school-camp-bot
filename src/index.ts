import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

import { setupMenuModule } from './modules/menu';
import { getAdminPanelKeyboard, getContentManagementKeyboard, getWelcomeMessageKeyboard } from './modules/admin';
import { setupButtonManager } from './modules/button_manager';
import { setupWelcomeManager } from './modules/welcome_manager';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN must be provided!");

const bot = new Telegraf(token);
const prisma = new PrismaClient();
const OWNER_ID = parseInt(process.env.OWNER_ID || "0");

const escapeHTML = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

const { buildDynamicKeyboard } = setupMenuModule(bot, prisma);
setupButtonManager(bot, prisma);
setupWelcomeManager(bot, prisma); 

bot.command("start", async (ctx) => {
    // جلب الرسالة وإعدادات معاينة الروابط من الداتا بيز
    const [welcomeSetting, linkPreviewSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "welcome_message" } }),
        prisma.setting.findUnique({ where: { key: "welcome_link_preview" } })
    ]);

    let welcomeText = welcomeSetting?.value || "أهلاً بك يا #name في بوت ثانوية الدراسي! 🎓\nاختر من القائمة أدناه:";
    const disableWebPagePreview = linkPreviewSetting?.value === "false";

    const safeFirstName = escapeHTML(ctx.from.first_name || "مستخدم");
    const safeUsername = ctx.from.username ? `@${escapeHTML(ctx.from.username)}` : safeFirstName;

    welcomeText = welcomeText.replace(/#name_user/g, `<a href="tg://user?id=${ctx.from.id}">${safeFirstName}</a>`);
    welcomeText = welcomeText.replace(/#username/g, safeUsername);
    welcomeText = welcomeText.replace(/#name/g, safeFirstName);
    welcomeText = welcomeText.replace(/#id/g, ctx.from.id.toString());
    welcomeText = welcomeText.replace(/#points/g, "0"); 
    welcomeText = welcomeText.replace(/#invitelink/g, `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`);

    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from.id) } });
    const keyboard = await buildDynamicKeyboard(null);

    // دمج زراير الإدارة في رسالة الترحيب للمطور
    if (user && (user.role === "OWNER" || user.role === "ADMIN")) {
        const adminKeyboard = getAdminPanelKeyboard(true, true);
        keyboard.reply_markup.inline_keyboard.push([
            Markup.button.callback("—— 👨‍💻 لوحة الإدارة ——", "no_action_separator")
        ]);
        keyboard.reply_markup.inline_keyboard.push(...adminKeyboard.reply_markup.inline_keyboard);
    }

    try {
        await ctx.reply(welcomeText, {
            reply_markup: keyboard.reply_markup,
            parse_mode: "HTML",
            link_preview_options: { is_disabled: disableWebPagePreview }
        });
    } catch (error: any) {
        if (user && (user.role === "OWNER" || user.role === "ADMIN")) {
            await ctx.reply(`⚠️ **تنبيه للمطور: تليجرام رفض كود الترحيب!**\n\n**السبب التقني:**\n<code>${error.message}</code>\n\n📌 *غالباً المشكلة إنك استخدمت إيموجي مدفوع (ممنوع للبوتات العادية) أو نسيت تقفل قوس HTML.*`, { parse_mode: "HTML" });
        }
        await ctx.reply(welcomeText, {
            reply_markup: keyboard.reply_markup
        });
    }
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

bot.action("admin_welcome_msg", async (ctx) => {
    const welcomeKeyboard = getWelcomeMessageKeyboard();
    await ctx.editMessageText("👋 **إدارة رسالة الترحيب**\n\nمن هنا تقدر تتحكم في شكل وإعدادات الرسالة اللي بتظهر لأي حد بيعمل /start:", {
        parse_mode: "Markdown",
        reply_markup: welcomeKeyboard.reply_markup
    });
});

bot.action("no_action_separator", async (ctx) => {
    await ctx.answerCbQuery();
});

bot.action("help_welcome_msg", async (ctx) => {
    await ctx.answerCbQuery("هذا القسم مخصص للتحكم الكامل في رسالة الترحيب، إضافة وسائط، تعديل الأزرار المرفقة، وضبط الإعدادات.", { show_alert: true });
});

// شيلنا منها زراير المسح ومعاينة الروابط عشان تشتغل
const emptyAdminButtons = [
    "admin_settings", "admin_users", "admin_camps", "admin_ads", 
    "admin_trash", "admin_system_support", "toggle_login_notif", 
    "toggle_block_notif", "admin_guide", "admin_groups",
    "admin_auto_replies", "admin_shortcuts", "admin_edits_list", 
    "admin_edit_content", "admin_deep_link", "admin_translation", 
    "admin_bot_info", "admin_help",
    "toggle_welcome_media", "welcome_msg_languages",
    "toggle_welcome_auto_reply", "toggle_welcome_protect", 
    "welcome_preview_small", "welcome_preview_large", "welcome_preview_above", "welcome_preview_link",
    "welcome_shortcuts", "welcome_buttons"
];

bot.action(emptyAdminButtons, async (ctx) => {
    await ctx.answerCbQuery("⏳ هذا القسم قيد التطوير يا هندسة، هنبرمجه قريباً!", { show_alert: true });
});

bot.launch().then(() => console.log("🤖 Bot is running..."))
.catch((err) => console.error("Error starting bot:", err));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
