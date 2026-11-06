export const KAIROS_ADMIN_EMAIL = 'makariosentreprises@gmail.com';

export function hasKairosAdminAccess(user) {
  return String(user?.email || '').trim().toLowerCase() === KAIROS_ADMIN_EMAIL;
}
