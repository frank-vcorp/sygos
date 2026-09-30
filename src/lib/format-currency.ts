export function formatMxnDisplay(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
    amount,
  );
}
