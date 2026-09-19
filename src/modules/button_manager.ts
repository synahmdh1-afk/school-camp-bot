import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';

const adminStates = new Map<number, { step: string, type: any }>();

export function setupButtonManager(bot: Telegraf, prisma: PrismaClient) {
    
    // فتح قائمة تعديل الأزرار
    bot.action("admin_edit_buttons", async (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback("📁 إضافة قسم رئيسي", "add_main_section")],
            [Markup.button.callback("🔙 رجوع", "admin_content")]
        ]);
        await ctx.editMessageText("🛠️ **تعديل الأزرار**\n\nمن هنا تقدر تبني واجهة البوت وتضيف أقسام:", keyboard);
    });

    // إضافة قسم رئيسي
    bot.action("add_main_section", async (ctx) => {
        if (!ctx.from) return;
        
        adminStates.set(ctx.from.id, { step: "WAITING_FOR_SECTION_NAME", type: "SECTION" });
        
        await ctx.answerCbQuery();
        await ctx.reply("✍️ ابعتلي دلوقتي اسم القسم الجديد (مثلاً: 📚 الصف الأول الثانوي):", 
            Markup.inlineKeyboard([[Markup.button.callback("❌ إلغاء", "cancel_action")]])
        );
    });

    // إلغاء العملية
    bot.action("cancel_action", async (ctx) => {
        if (!ctx.from) return;
        adminStates.delete(ctx.from.id);
        await ctx.editMessageText("❌ تم إلغاء العملية.");
    });

    // --- لوحة الأزرار الشفافة ---
    bot.action("admin_transparent_buttons", async (ctx) => {
        const text = `🔘 **الأزرار الشفافة**\n\nاضغط على الزر لتعديله\nاضغط + لإضافة زر جديد\n\nمحتوى 📝 | قسم 📁 | رابط 🔗 | تطبيق ويب 🌐`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback("+", "add_transparent_btn")],
            [
                Markup.button.callback("تعديل الأزرار 🔘", "edit_transparent_btns"),
                Markup.button.callback("الأساسية ❌", "no_action_yet") 
            ],
            [Markup.button.callback("شرح القسم ❓", "help_transparent_btns")],
            [Markup.button.callback("• رجوع •", "admin_content")]
        ]);

        await ctx.editMessageText(text, { 
            parse_mode: "Markdown",
            reply_markup: keyboard.reply_markup 
        });
    });

    bot.action("help_transparent_btns", async (ctx) => {
        await ctx.answerCbQuery("هذا القسم مخصص لإضافة وتعديل الأزرار الشفافة (Inline) التي تظهر أسفل الرسائل.", { show_alert: true });
    });
    
    bot.action("no_action_yet", async (ctx) => {
        await ctx.answerCbQuery("نظام الأزرار الأساسية (الكيبورد) غير مفعل حالياً.");
    });

    // استقبال النصوص من المطور لإضافة الأزرار
    bot.on("text", async (ctx, next) => {
        if (!ctx.from) return next();
        const state = adminStates.get(ctx.from.id);
        
        if (!state) return next();

        if (state.step === "WAITING_FOR_SECTION_NAME") {
            const btnName = ctx.message.text;
            
            try {
                await prisma.button.create({
                    data: {
                        name: btnName,
                        type: state.type, 
                        parentId: null, 
                        order: 10 
                    }
                });

                adminStates.delete(ctx.from.id);
                
                await ctx.reply(`✅ عاش يا هندسة! تم إضافة قسم "${btnName}" بنجاح.\n\nدوس /start عشان تشوفه ظهر في القائمة الرئيسية.`);
            } catch (error) {
                console.error(error);
                await ctx.reply("❌ حصلت مشكلة أثناء إضافة الزرار، جرب تاني.");
            }
        } else {
            return next();
        }
    });
}
