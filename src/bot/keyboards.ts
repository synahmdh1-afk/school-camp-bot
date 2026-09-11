import { Markup } from 'telegraf';

export const mainMenu = () => Markup.inlineKeyboard([
  [Markup.button.callback('📚 المعسكرات المجانية', 'camps:list')],
  [Markup.button.callback('📝 ملاحظاتي', 'notes:list'), Markup.button.callback('➕ ملاحظة جديدة', 'notes:new')],
  [Markup.button.callback('ℹ️ المساعدة', 'help')],
]);
