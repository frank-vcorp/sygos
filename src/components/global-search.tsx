"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
    <div className="relative min-w-[220px]">
      <input
        type="search"
        placeholder="Búsqueda global…"
        value={q}
        onChange={(e) => search(e.target.value)}
        className="w-full rounded-md border border-border px-2 py-1 text-sm outline-none ring-accent focus:ring-2"
      />
      {pending && q.length >= 2 && (
        <p className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white px-2 py-1 text-xs text-slate-500">
          Buscando…
        </p>
      )}
      {hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-white py-1 text-sm shadow-md">
          {hits.map((hit) => (
            <li key={`${hit.type}-${hit.id}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => {
                  setHits([]);
                  setQ("");
                  router.push(hit.href);
                }}
              >
                <span className="text-xs uppercase text-slate-400">{hit.type}</span>
                <span className="ml-2">{hit.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
