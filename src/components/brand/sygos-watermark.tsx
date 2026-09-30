import Image from "next/image";

/** Marca de agua decorativa en el área de trabajo (no intercepta clics). */
export function SygosWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-[272px]"
      aria-hidden
    >
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
