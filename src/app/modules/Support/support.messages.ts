export const supportMessages = {
  // --- Unique Support & Ticket Logic Errors ---
  NO_ACTIVE_TICKET_AGENTS_CANNOT_CREATE: {
    en: 'No active ticket found for this user. Support agents cannot initialize new tickets.',
    pt: 'Nenhum ticket ativo encontrado para este usuário. Os agentes de suporte não podem iniciar novos tickets.',
  },
  NOT_AUTHORIZED_FOR_ORDER_SUPPORT_TICKET: {
    en: 'You do not have permission to create a support ticket for this order.',
    pt: 'Você não tem permissão para criar um ticket de suporte para este pedido.',
  },
  ACTIVE_TICKET_NOT_FOUND: {
    en: 'No active support ticket was found for your account.',
    pt: 'Nenhum ticket de suporte ativo foi encontrado para sua conta.',
  },

  // --- Unique Lifecycle & Chat Success Messages ---
  MESSAGE_PROCESSED_SUCCESS: {
    en: 'Support message sent successfully.',
    pt: 'Mensagem de suporte enviada com sucesso.',
  },
  MESSAGES_MARKED_AS_READ: {
    en: 'Support chat messages marked as read.',
    pt: 'Mensagens do chat de suporte marcadas como lidas.',
  },
  SUPPORT_CLOSED_SYSTEM_MESSAGE: {
    en: 'This support session has been closed. Send a new message to open a new ticket.',
    pt: 'Esta sessão de suporte foi encerrada. Envie uma nova mensagem para abrir um novo ticket.',
  },
  TICKET_CLOSED: {
    en: 'Support ticket closed successfully.',
    pt: 'Ticket de suporte encerrado com sucesso.',
  },

  // --- Global Mappings Block (To be handled by globalCommonMessages) ---
  TICKETS_RETRIEVED: {
    en: 'Support tickets loaded successfully.',
    pt: 'Tickets de suporte carregados com sucesso.',
  },
  CHAT_HISTORY_RETRIEVED: {
    en: 'Chat history loaded successfully.',
    pt: 'Histórico do chat carregado com sucesso.',
  },
  TICKET_NOT_FOUND: { en: 'Ticket not found.', pt: 'Ticket não encontrado.' },
} as const;
