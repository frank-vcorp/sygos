import Image from "next/image";

/** Marca de agua decorativa en el área de trabajo (no intercepta clics). */
export function SygosWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-[272px]"
      aria-hidden
    >
      <svg
        className="absolute bottom-0 left-0 h-[min(32vh,240px)] w-full"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sygos-footer-wave" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--brand-teal)" stopOpacity="0" />
            <stop offset="45%" stopColor="var(--brand-teal)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--brand-teal)" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path
          fill="url(#sygos-footer-wave)"
          d="M0,128 C180,88 320,168 520,118 C720,68 920,148 1200,98 L1200,200 L0,200 Z"
        />
        <path
          fill="none"
          stroke="var(--brand-teal)"
          strokeWidth="2.5"
          strokeOpacity="0.18"
          vectorEffect="non-scaling-stroke"
          d="M-20,112 C200,52 380,158 600,96 C820,34 1000,128 1220,84"
        />
      </svg>

      <div
        className="absolute bottom-8 right-4 w-[min(52vw,26rem)] max-w-[calc(100%-2rem)] sm:bottom-12 sm:right-8 sm:w-[min(44vw,28rem)] lg:bottom-14 lg:right-12 lg:w-[min(38vw,32rem)]"
      >
        <Image
          src="/brand/sygos-lockup.png"
          alt=""
          width={200}
          height={93}
          className="h-auto w-full select-none opacity-[0.065] saturate-[0.85]"
          priority={false}
        />
      </div>
    </div>
  );
}
