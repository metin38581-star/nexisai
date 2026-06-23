/** Kayıt sonrası otomatik tanımlanan hoş geldin cüzdan bakiyesi (TL). */
export const WELCOME_BALANCE_TL = 300;

/** Eski hoş geldin politikası (TL) — yalnızca legacy reconcile için. */
export const LEGACY_WELCOME_BALANCE_TL = 100;

/** Önerilen varsayılan cüzdan yükleme miktarı (TL) — hoş geldin bakiyesi ile hizalı. */
export const DEFAULT_WALLET_TOPUP_TL = WELCOME_BALANCE_TL;

export function formatWelcomeBalanceMessage(): string {
  return `${WELCOME_BALANCE_TL.toLocaleString("tr-TR")} ₺`;
}

export function formatWelcomeBalanceStat(): string {
  return `${WELCOME_BALANCE_TL.toLocaleString("tr-TR")} ₺`;
}
