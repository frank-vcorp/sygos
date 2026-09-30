"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Search } from "lucide-react";

type Hit = { type: string; id: string; label: string; href: string };

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [pending, startTransition] = useTransition();

  function search(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
      if (!res.ok) {
        setHits([]);
        return;
      }
      const data = (await res.json()) as { hits: Hit[] };
      setHits(data.hits);
    });
  }

  return (
    <div className="relative min-w-[280px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        placeholder="Buscar clientes, equipos, folios…"
        value={q}
        onChange={(e) => search(e.target.value)}
        className="h-10 w-full rounded-xl border border-border bg-slate-50/80 py-2 pl-9 pr-10 text-sm outline-none focus:border-[var(--ring)] focus:bg-white focus:ring-4 focus:ring-blue-100/60"
      />
      {pending && q.length >= 2 && <LoaderCircle className="absolute right-3 top-3 size-4 animate-spin text-accent" />}
      {hits.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-white p-1.5 text-sm shadow-xl">
          {hits.map((hit) => (
            <li key={`${hit.type}-${hit.id}`}>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
                onClick={() => {
                  setHits([]);
                  setQ("");
                  router.push(hit.href);
                }}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{hit.type}</span>
                <span className="mt-0.5 block font-medium text-foreground">{hit.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
