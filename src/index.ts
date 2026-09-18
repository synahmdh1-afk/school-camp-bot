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

// ذاكرة مؤقتة لحفظ حالة المستخدم (عشان نعرف إنك بتكتب رسالة الترحيب دلوقتي)
const userStates = new Map<number, string>();

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

// دالة القائمة الرئيسية
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
    // قراءة رسالة الترحيب من قاعدة البيانات
    let welcomeSetting = await prisma.setting.findUnique({ where: { key: "welcome_message" } });
    
    let welcomeText = welcomeSetting?.value || "أهلاً بك يا {name} في بوت ثانوية الدراسي! 🎓\nاختر من القائمة أدناه:";
    
    // استبدال {name} باسم المستخدم الحقيقي
    welcomeText = welcomeText.replace(/{name}/g, ctx.from.first_name);

    const keyboard = await getMainMenuKeyboard(ctx.from.id);
    
    // مسح أي حالة سابقة ليك
    userStates.delete(ctx.from.id);

    await ctx.reply(welcomeText, keyboard);
});

// --- أوامر أزرار المستخدمين ---

bot.action("menu_sections", async (ctx) => {
    const buttons = [
        [Markup.button.callback("الصف الأول الثانوي", "grade_1"), Markup.button.callback("الصف الثاني الثانوي", "grade_2")],
        [Markup.button.callback("الصف الثالث الثانوي", "grade_3")],
        [Markup.button.callback("🔙 رجوع", "main_menu")]
    ];
    await ctx.editMessageText("📚 أقسام المذاكرة:\nاختر الصف الدراسي الخاص بك:", Markup.inlineKeyboard(buttons));
});

bot.action("camp_pro_menu", async (ctx) => {
    const buttons = [
        [Markup.button.callback("ℹ️ تفاصيل المعسكر", "camp_info"), Markup.button.callback("✅ الاشتراك", "camp_sub")],
        [Markup.button.callback("🔙 رجوع", "main_menu")]
    ];
    await ctx.editMessageText("🏕️ قسم Camp Pro:\nهنا يمكنك الانضمام للمعسكرات الدراسية والمتابعة مع المدرسين.", Markup.inlineKeyboard(buttons));
});

bot.action("main_menu", async (ctx) => {
    const keyboard = await getMainMenuKeyboard(ctx.from!.id);
    
    let welcomeSetting = await prisma.setting.findUnique({ where: { key: "welcome_message" } });
    let welcomeText = welcomeSetting?.value || "أهلاً بك يا {name} في بوت ثانوية الدراسي! 🎓\nاختر من القائمة أدناه:";
    welcomeText = welcomeText.replace(/{name}/g, ctx.from!.first_name);

    await ctx.editMessageText(welcomeText, keyboard);
});

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

// برمجة زرار إدارة المحتوى
bot.action("admin_content", async (ctx) => {
    const buttons = [
        [Markup.button.callback("📝 تعديل رسالة الترحيب", "edit_welcome_msg")],
        [Markup.button.callback("🔙 رجوع للوحة المطور", "admin_panel")]
    ];
    await ctx.editMessageText("📋 إدارة المحتوى:\nماذا تريد أن تفعل؟", Markup.inlineKeyboard(buttons));
});

// زرار تعديل رسالة الترحيب
bot.action("edit_welcome_msg", async (ctx) => {
    // البوت بيعلم عليك إنك مستعد تكتب الرسالة الجديدة
    userStates.set(ctx.from!.id, "WAITING_FOR_WELCOME_MSG");
    await ctx.reply("أرسل الآن رسالة الترحيب الجديدة في رسالة نصية ✍️\n\n💡 نصيحة: لو عايز البوت ينادي كل واحد باسمه، اكتب كلمة `{name}` في وسط الكلام، والبوت هيستبدلها أوتوماتيك باسم اليوزر.");
    await ctx.answerCbQuery();
});

// استقبال الرسائل النصية عشان نحفظها في قاعدة البيانات
bot.on("text", async (ctx, next) => {
    const state = userStates.get(ctx.from.id);
    
    // لو البوت مستنيك تكتب رسالة الترحيب
    if (state === "WAITING_FOR_WELCOME_MSG") {
        // حفظ الرسالة في قاعدة البيانات
        await prisma.setting.upsert({
            where: { key: "welcome_message" },
            update: { value: ctx.message.text },
            create: { key: "welcome_message", value: ctx.message.text }
        });
        
        // مسح الحالة عشان ترجع مستخدم عادي
        userStates.delete(ctx.from.id);
        
        await ctx.reply("تم حفظ رسالة الترحيب الجديدة بنجاح! ✅\nتقدر تبعت /start عشان تتأكد.");
        return;
    }
    
    return next();
});

// ردود مؤقتة لباقي زراير الإدمن عشان متهنجش
bot.action(["admin_users", "admin_ads", "admin_roles", "admin_trash", "admin_settings"], (ctx) => {
    ctx.answerCbQuery("⚙️ الميزة دي لسه بتتبرمج يا هندسة!", { show_alert: true });
});

bot.launch().then(() => {
    console.log("🤖 Bot is running...");
}).catch((err) => {
    console.error("Error starting bot:", err);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
