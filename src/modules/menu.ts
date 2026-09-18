import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';

// الدالة دي اللي هنستدعيها في ملف index.ts عشان نشغل النظام ده
export function setupMenuModule(bot: Telegraf, prisma: PrismaClient) {
    
    // دالة سحرية بتبني الزراير بناءً على القسم اللي إنت فيه
    async function buildDynamicKeyboard(parentId: number | null = null) {
        // بنجيب الزراير من الداتا بيز حسب القسم، والمخفية والمحذوفة مش بتظهر
        const buttons = await prisma.button.findMany({
            where: { 
                parentId: parentId,
                isHidden: false,
                isDeleted: false 
            },
            orderBy: { order: 'asc' } // ترتيب حسب ما المطور يحدد
        });

        const keyboard: any[] = [];
        let currentRow: any[] = [];

        // بنرص كل زرارين جنب بعض في صف عشان الشكل يبقى متناسق
        buttons.forEach((btn, index) => {
            const btnText = btn.emoji ? `${btn.emoji} ${btn.name}` : btn.name;
            
            let callbackData = "";
            if (btn.type === "SECTION") callbackData = `section_${btn.id}`;
            else if (btn.type === "CONTENT") callbackData = `content_${btn.id}`;
            else if (btn.type === "FUNCTION") callbackData = `func_${btn.content}`; 

            // لو الزرار رابط خارجي أو Web App
            if (btn.type === "LINK" || btn.type === "WEB_APP") {
                if (btn.content) currentRow.push(Markup.button.url(btnText, btn.content));
            } else {
                currentRow.push(Markup.button.callback(btnText, callbackData));
            }

            // لو الصف اتملى (زرارين) أو ده آخر زرار، ضيفه للقائمة
            if (currentRow.length === 2 || index === buttons.length - 1) {
                keyboard.push(currentRow);
                currentRow = [];
            }
        });

        return Markup.inlineKeyboard(keyboard);
    }

    // أمر لفتح أي قسم فرعي
    bot.action(/section_(.+)/, async (ctx) => {
        const sectionId = parseInt(ctx.match[1]);
        const keyboard = await buildDynamicKeyboard(sectionId);
        
        // نجيب بيانات القسم عشان نعرف اسم القسم وإيه القسم الأب بتاعه
        const section = await prisma.button.findUnique({ where: { id: sectionId } });
        const backParentId = section?.parentId || null;
        
        // تجهيز زرار الرجوع للمكان الصح
        const backData = backParentId ? `section_${backParentId}` : `main_menu`;
        keyboard.reply_markup.inline_keyboard.push([
            Markup.button.callback("🔙 رجوع", backData)
        ]);

        await ctx.editMessageText(`📂 ${section?.name || 'قسم'}\nاختر من القائمة:`, keyboard);
    });

    // أمر لعرض المحتوى بتاع أي زرار
    bot.action(/content_(.+)/, async (ctx) => {
        const contentId = parseInt(ctx.match[1]);
        const btn = await prisma.button.findUnique({ where: { id: contentId } });
        
        if (btn && btn.content) {
            const backData = btn.parentId ? `section_${btn.parentId}` : `main_menu`;
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع", backData)]
            ]);
            
            await ctx.editMessageText(btn.content, keyboard);
        } else {
            await ctx.answerCbQuery("❌ هذا المحتوى فارغ حالياً!", { show_alert: true });
        }
    });

    // أمر للرجوع للقائمة الرئيسية
    bot.action("main_menu", async (ctx) => {
        const keyboard = await buildDynamicKeyboard(null);
        await ctx.editMessageText("🏠 القائمة الرئيسية:\nاختر من القائمة أدناه:", keyboard);
    });

    // بنعمل تصدير لدالة بناء الزراير عشان نستخدمها في أمر /start
    return { buildDynamicKeyboard };
}

