/** Kayıt sonrası otomatik tanımlanan hoş geldin cüzdan bakiyesi (TL). */
export const WELCOME_BALANCE_TL = 300;

export function formatWelcomeBalanceMessage(): string {
  return `${WELCOME_BALANCE_TL.toLocaleString("tr-TR")} ₺`;
}
