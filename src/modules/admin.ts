import { Markup } from 'telegraf';

// 1. دالة اللوحة الرئيسية للمطور
export function getAdminPanelKeyboard(loginNotif: boolean, blockNotif: boolean) {
    const loginIcon = loginNotif ? "✅" : "❌";
    const blockIcon = blockNotif ? "✅" : "❌";

    return Markup.inlineKeyboard([
        [
            Markup.button.callback("⚙️ الإعدادات", "admin_settings"),
            Markup.button.callback("📝 إدارة المحتوى", "admin_content")
        ],
        [
            Markup.button.callback("👥 المستخدمون", "admin_users"),
            Markup.button.callback("🏕️ إدارة المعسكرات", "admin_camps")
        ],
        [
            Markup.button.callback("📢 الإعلانات", "admin_ads"),
            Markup.button.callback("🗑️ سلة المحذوفات", "admin_trash")
        ],
        [
            Markup.button.callback("🛠 النظام والدعم", "admin_system_support")
        ],
        [
            Markup.button.callback(`${loginIcon} إشعار الدخول`, "toggle_login_notif"),
            Markup.button.callback(`${blockIcon} إشعار الحظر`, "toggle_block_notif")
        ],
        [
            Markup.button.callback("❓ دليل الاستخدام", "admin_guide")
        ],
        [
            Markup.button.callback("• إدارة الجروبات والرتب •", "admin_groups")
        ]
    ]);
}

// 2. دالة لوحة "إدارة المحتوى" 
export function getContentManagementKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback("رسالة الترحيب 👋", "admin_welcome_msg")],
        [Markup.button.callback("الردود التلقائية 💬", "admin_auto_replies")],
        [
            Markup.button.callback("تعديل الأزرار ✏️", "admin_edit_buttons"),
            Markup.button.callback("الأزرار الشفافة 🔘", "admin_transparent_buttons")
        ],
        [Markup.button.callback("الاختصارات 📎", "admin_shortcuts")],
        [
            Markup.button.callback("قائمة التعديلات 📋", "admin_edits_list"),
            Markup.button.callback("تعديل المحتوى ✏️", "admin_edit_content")
        ],
        [Markup.button.callback("ديب لينك مخصص (0) 🔗", "admin_deep_link")],
        [Markup.button.callback("الترجمة 🌐", "admin_translation")],
        [Markup.button.callback("معلومات البوت ℹ️", "admin_bot_info")],
        [Markup.button.callback("المساعدة ❓", "admin_help")],
        [Markup.button.callback("• رجوع •", "admin_panel")] 
    ]);
}

// 3. دالة لوحة "رسالة الترحيب" (نفس تصميم الصورة بالظبط)
export function getWelcomeMessageKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("تعيين الرسالة 📝", "set_welcome_msg"), 
            Markup.button.callback("مسح 🗑️", "clear_welcome_msg")
        ],
        [Markup.button.callback("الوسائط 📎 ❌", "toggle_welcome_media")],
        [Markup.button.callback("رسالة لكل لغة 🌐", "welcome_msg_languages")],
        [Markup.button.callback("—— الإعدادات ——", "no_action_separator")],
        [Markup.button.callback("رد تلقائي 💬 ✅", "toggle_welcome_auto_reply")],
        [Markup.button.callback("حماية المحتوى 🔒 ❌", "toggle_welcome_protect")],
        [Markup.button.callback("معاينة الروابط 🔗 ✅", "toggle_welcome_link_preview")],
        [
            Markup.button.callback("صغير 🔽 ❌", "welcome_preview_small"),
            Markup.button.callback("كبير 🔼 ❌", "welcome_preview_large"),
            Markup.button.callback("فوق ⬆️ ❌", "welcome_preview_above")
        ],
        [Markup.button.callback("رابط المعاينة 🔗", "welcome_preview_link")],
        [Markup.button.callback("—— تخصيص ——", "no_action_separator")],
        [
            Markup.button.callback("الاختصارات ⌨️", "welcome_shortcuts"), 
            Markup.button.callback("الأزرار 🔘", "welcome_buttons")
        ],
        [Markup.button.callback("شرح القسم ❓", "help_welcome_msg")],
        [Markup.button.callback("• رجوع •", "admin_content")]
    ]);
}
