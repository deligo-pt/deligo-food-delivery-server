import { addonMessages } from '../modules/Add-Ons/addOns.messages';
import { adminMessages } from '../modules/Admin/admin.messages';
import { authMessages } from '../modules/Auth/auth.messages';

const globalCommonMessages = {
  // --- DEFAULT SERVER ERRORS ---
  SOMETHING_WENT_WRONG: {
    en: 'Something went wrong on the server!',
    pt: 'Algo deu errado no servidor!',
  },
  UNKNOWN_SERVER_ERROR: {
    en: 'Unknown Server Error',
    pt: 'Erro desconhecido do servidor',
  },

  // --- MULTER FILE UPLOAD ERRORS ---
  FILE_TOO_LARGE: {
    en: 'File size is too large. Maximum limit is 5MB.',
    pt: 'O tamanho do arquivo é muito grande. O limite máximo é de 5MB.',
  },
  FILE_COUNT_EXCEEDED: {
    en: 'You cannot upload more than 5 files at a time.',
    pt: 'Você não pode enviar mais de 5 arquivos por vez.',
  },
  UNEXPECTED_FILE_FIELD: {
    en: 'Unexpected field. Please check the key name (e.g., "files").',
    pt: 'Campo inesperado. Por favor, verifique o nome da chave (ex: "files").',
  },
} as const;

export const localizedMessages = {
  ...globalCommonMessages,
  ...authMessages,
  ...addonMessages,
  ...adminMessages,
} as const;

// Global type safe key
export type TMessageKey = keyof typeof localizedMessages;
