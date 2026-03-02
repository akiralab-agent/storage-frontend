export const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "ISSUED", label: "Emitida" },
  { value: "PAID", label: "Paga" },
  { value: "OVERDUE", label: "Vencida" },
  { value: "VOID", label: "Anulada" }
];

export const STATUS_LABELS = {
  DRAFT: "Rascunho",
  ISSUED: "Emitida",
  PAID: "Paga",
  OVERDUE: "Vencida",
  VOID: "Anulada"
};

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "CARD", label: "Cartão" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" }
];
