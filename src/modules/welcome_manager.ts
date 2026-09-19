import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';

const welcomeStates = new Map<number, string>();

export function setupWelcomeManager(bot: Telegraf, prisma: PrismaClient) {
    
    // لما المطور يدوس على "تعيين الرسالة"
    bot.action("set_welcome_msg", async (ctx) => {
        if (!ctx.from) return;
        
        // نسجل إن المطور بيكتب رسالة الترحيب دلوقتي
        welcomeStates.set(ctx.from.id, "WAITING_FOR_WELCOME_MSG");
        
        // نفس النص اللي في الصورة بالظبط
        const text = `• إرسال الكليشة الآن.\n\n- يمكنك إضافة بعض العناصر إلى كليشة start باستخدام الهاشتاقات التالية:\n\n1. #name_user : لوضع اسم الشخص مع معرفه داخل اسمه\n2. #username : لوضع اسم مستخدم الشخص مع إضافة @\n3. #name : لوضع اسم الشخص\n4. #id : لوضع ايدي الشخص\n5. #points : لوضع عدد نقاط الشخص\n6. #invitelink : لوضع رابط الدعوة`;
        
        await ctx.editMessageText(text, 
            Markup.inlineKeyboard([[Markup.button.callback("❌ إلغاء", "cancel_welcome_msg")]])
        );
    });

    // زرار الإلغاء
    bot.action("cancel_welcome_msg", async (ctx) => {
        if (!ctx.from) return;
        welcomeStates.delete(ctx.from.id);
        await ctx.editMessageText("❌ تم إلغاء تعيين رسالة الترحيب.");
    });

    // استقبال رسالة الترحيب الجديدة من المطور
    bot.on("text", async (ctx, next) => {
        if (!ctx.from) return next();
        const state = welcomeStates.get(ctx.from.id);
        
        if (state === "WAITING_FOR_WELCOME_MSG") {
            const newWelcomeMsg = ctx.message.text;
            
            try {
                // حفظ الرسالة في الداتا بيز
                await prisma.setting.upsert({
                    where: { key: "welcome_message" },
                    update: { value: newWelcomeMsg },
                    create: { key: "welcome_message", value: newWelcomeMsg }
                });

                welcomeStates.delete(ctx.from.id);
                await ctx.reply("✅ تم حفظ رسالة الترحيب بنجاح! جرب دلوقتي ابعت /start وشوف النتيجة.");
            } catch (error) {
                console.error(error);
                await ctx.reply("❌ حدث خطأ أثناء حفظ الرسالة.");
            }
        } else {
            return next();
        }
    });
}
