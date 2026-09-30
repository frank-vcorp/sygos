import Image from "next/image";
import {
  disconnectWhatsAppAction,
  startWhatsAppPairingAction,
} from "@/app/app/integraciones/whatsapp-actions";

export function WhatsAppConfigPanel({
  status,
  linkedPhone,
  lastError,
  qrDataUrl,
}: {
  status: string;
  linkedPhone?: string | null;
  lastError?: string | null;
  qrDataUrl?: string | null;
}) {
  return (
    <div className="space-y-3 text-xs">
      <p className="text-slate-600">
        Sesión Baileys por empresa. Escanea el QR con WhatsApp → Dispositivos vinculados.
      </p>
      <p className="font-medium text-slate-800">
        Estado:{" "}
        {status === "CONNECTED"
          ? `Conectado (${linkedPhone ?? "teléfono"})`
          : status === "QR_PENDING"
            ? "Esperando escaneo de QR"
            : "Desconectado"}
      </p>
      {lastError && <p className="text-danger">{lastError}</p>}
      {qrDataUrl && (
        <div className="rounded-lg border border-border bg-white p-2">
          <Image src={qrDataUrl} alt="Código QR WhatsApp" width={240} height={240} unoptimized />
          <p className="mt-1 text-[10px] text-slate-500">Si expira, pulsa «Actualizar QR».</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <form action={startWhatsAppPairingAction}>
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            {status === "QR_PENDING" ? "Actualizar QR" : "Vincular con QR"}
          </button>
        </form>
        {status === "CONNECTED" && (
          <form action={disconnectWhatsAppAction}>
            <button
              type="submit"
              className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger"
            >
              Desvincular
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
