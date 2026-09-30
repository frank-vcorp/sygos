const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatMxn(amount: number) {
  return MXN.format(amount);
}

export function formatDateEs(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeEs(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
