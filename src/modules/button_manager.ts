import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';

// خريطة في الذاكرة عشان البوت يفتكر حالة المطور (الخطوة اللي واقف فيها)
const adminStates = new Map<number, { step: string, type: string }>();

export function setupButtonManager(bot: Telegraf, prisma: PrismaClient) {
    
    // 1. فتح قائمة تعديل الأزرار
    bot.action("admin_edit_buttons", async (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback("📁 إضافة قسم رئيسي", "add_main_section")],
            [Markup.button.callback("🔙 رجوع", "admin_content")]
        ]);
        await ctx.editMessageText("🛠️ **تعديل الأزرار**\n\nمن هنا تقدر تبني واجهة البوت وتضيف أقسام:", keyboard);
    });

    // 2. لما المطور يدوس "إضافة قسم رئيسي"
    bot.action("add_main_section", async (ctx) => {
        if (!ctx.from) return;
        
        // بنسجل إن المطور ده مطلوب منه يبعت اسم القسم دلوقتي
        adminStates.set(ctx.from.id, { step: "WAITING_FOR_SECTION_NAME", type: "SECTION" });
        
        await ctx.answerCbQuery();
        await ctx.reply("✍️ ابعتلي دلوقتي اسم القسم الجديد (مثلاً: 📚 الصف الأول الثانوي):", 
            Markup.inlineKeyboard([[Markup.button.callback("❌ إلغاء", "cancel_action")]])
        );
    });

    // 3. زرار الإلغاء لو المطور غير رأيه
    bot.action("cancel_action", async (ctx) => {
        if (!ctx.from) return;
        adminStates.delete(ctx.from.id);
        await ctx.editMessageText("❌ تم إلغاء العملية.");
    });

    // 4. البوت بيسمع لأي رسالة نصية عشان يلقط اسم الزرار
    bot.on("text", async (ctx, next) => {
        if (!ctx.from) return next();
        const state = adminStates.get(ctx.from.id);
        
        // لو المطور مش بيعمل إضافة (مفيش حالة متسجلة)، البوت يتجاهل الرسالة ويكمل شغل عادي
        if (!state) return next();

        if (state.step === "WAITING_FOR_SECTION_NAME") {
            const btnName = ctx.message.text;
            
            try {
                // تسجيل الزرار في قاعدة البيانات
                await prisma.button.create({
                    data: {
                        name: btnName,
                        type: state.type,
                        parentId: null, // null يعني قسم رئيسي بره خالص
                        order: 10 
                    }
                });

                // نمسح الحالة من الذاكرة عشان البوت يرجع لطبيعته
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
