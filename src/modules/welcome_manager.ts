import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';

const welcomeStates = new Map<number, string>();

export function setupWelcomeManager(bot: Telegraf, prisma: PrismaClient) {
    
    bot.action("set_welcome_msg", async (ctx) => {
        if (!ctx.from) return;
        welcomeStates.set(ctx.from.id, "WAITING_FOR_WELCOME_MSG");
        
        const text = `📝 <b>التنسيقات المدعومة للكليشة</b>

أرسل الرسالة بأي تنسيق وسيتم التعرّف عليه ✨

━━━━━━━━━━━━━━━
🌐 <b>تنسيقات HTML (موصى بها):</b>

&lt;b&gt;نص&lt;/b&gt; → <b>عريض</b>
&lt;i&gt;نص&lt;/i&gt; → <i>مائل</i>
&lt;u&gt;نص&lt;/u&gt; → <u>خط سفلي</u>
&lt;s&gt;نص&lt;/s&gt; → <s>يتوسطه خط</s>
&lt;code&gt;نص&lt;/code&gt; → <code>كود</code>
&lt;a href="URL"&gt;نص&lt;/a&gt; → رابط

━━━━━━━━━━━━━━━
🔗 <b>الهاشتاقات (عناصر الكليشة):</b>

1. <code>#name_user</code> : وضع اسم الشخص مع منشن
2. <code>#username</code> : وضع يوزرنيم الشخص
3. <code>#name</code> : اسم الشخص فقط
4. <code>#id</code> : ايدي الشخص
5. <code>#points</code> : عدد نقاط الشخص
6. <code>#invitelink</code> : رابط الدعوة

👇 <b>أرسل كليشة الترحيب الجديدة الآن:</b>`;
        
        await ctx.editMessageText(text, {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback("❌ إلغاء", "cancel_welcome_msg")]]).reply_markup
        });
    });

    bot.action("cancel_welcome_msg", async (ctx) => {
        if (!ctx.from) return;
        welcomeStates.delete(ctx.from.id);
        await ctx.editMessageText("❌ تم إلغاء تعيين رسالة الترحيب.");
    });

    // 🚀 جديد: مسح رسالة الترحيب
    bot.action("clear_welcome_msg", async (ctx) => {
        try {
            await prisma.setting.delete({ where: { key: "welcome_message" } });
            await ctx.answerCbQuery("✅ تم مسح الرسالة المخصصة والرجوع للرسالة الافتراضية!", { show_alert: true });
        } catch (error) {
            await ctx.answerCbQuery("✅ الرسالة الافتراضية تعمل بالفعل.", { show_alert: true });
        }
    });

    // 🚀 جديد: تفعيل/تعطيل معاينة الروابط
    bot.action("toggle_welcome_link_preview", async (ctx) => {
        let setting = await prisma.setting.findUnique({ where: { key: "welcome_link_preview" } });
        // لو مفيش قيمة، هنعتبرها متفعلة، ولما يدوس نعطلها (false)
        let newState = setting?.value === "false" ? "true" : "false";
        
        await prisma.setting.upsert({
            where: { key: "welcome_link_preview" },
            update: { value: newState },
            create: { key: "welcome_link_preview", value: newState }
        });
        
        const status = newState === "true" ? "✅ تم تفعيل معاينة الروابط" : "❌ تم إخفاء معاينة الروابط";
        await ctx.answerCbQuery(status, { show_alert: true });
    });

    bot.on("text", async (ctx, next) => {
        if (!ctx.from) return next();
        const state = welcomeStates.get(ctx.from.id);
        
        if (state === "WAITING_FOR_WELCOME_MSG") {
            const newWelcomeMsg = ctx.message.text;
            try {
                await prisma.setting.upsert({
                    where: { key: "welcome_message" },
                    update: { value: newWelcomeMsg },
                    create: { key: "welcome_message", value: newWelcomeMsg }
                });
                welcomeStates.delete(ctx.from.id);
                await ctx.reply("✅ <b>تم حفظ رسالة الترحيب بنجاح!</b>\nجرب الآن إرسال /start لرؤية النتيجة.", { parse_mode: "HTML" });
            } catch (error) {
                console.error(error);
                await ctx.reply("❌ حدث خطأ أثناء حفظ الرسالة.");
            }
        } else {
            return next();
        }
    });
}
