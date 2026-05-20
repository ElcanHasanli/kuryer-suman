export const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  licenseCode: 'license_code',
} as const;

export function getLicenseCode(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.licenseCode) || '';
}

export function setLicenseCode(code: string) {
  localStorage.setItem(STORAGE_KEYS.licenseCode, code.trim());
}
