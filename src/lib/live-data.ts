import { unstable_noStore as noStore } from "next/cache";

/** Evita caché RSC en lecturas de custodia/almacén tras server actions. */
export function readLiveOperationalData() {
  noStore();
}
