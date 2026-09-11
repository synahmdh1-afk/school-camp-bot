import 'dotenv/config';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN غير موجود. أضفه إلى متغيرات Railway.');

export const config = {
  token,
  ownerTelegramId: process.env.OWNER_TELEGRAM_ID ? BigInt(process.env.OWNER_TELEGRAM_ID) : null,
};
