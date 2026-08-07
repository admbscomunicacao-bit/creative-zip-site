/**
 * Guarda temporariamente (na memória do navegador) os dados preenchidos no cadastro
 * para que possam ser salvos no perfil logo após a confirmação do e-mail.
 */
export type PendingSignupData = {
  fullName: string;
  phone: string;
  bio: string;
  avatarFile: File | null;
};

let pending: PendingSignupData | null = null;

export function setPendingSignup(data: PendingSignupData) {
  pending = data;
}

export function getPendingSignup(): PendingSignupData | null {
  return pending;
}

export function clearPendingSignup() {
  pending = null;
}

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const AVATAR_TYPES_LABEL = "JPG, PNG, WebP ou GIF";
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
