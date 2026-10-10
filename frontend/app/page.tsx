import { EmailWorkspace } from "@/components/EmailWorkspace";
import snoop from "../snoop.png";

export default function DashboardPage() {
  return (
    <main className="relative mx-auto w-full max-w-[78rem] px-6 pt-20 pb-24 md:px-10 md:pt-16 lg:px-14">
      {/* sits left of true centre so the artwork has room to breathe on the right */}
      <div className="relative z-10">
        <div className="mt-10 max-w-[52rem]">
          <EmailWorkspace limit={8} />
        </div>
      </div>

      {/* snoop artwork only on dashboard, in the right corner */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[26px] right-0 md:top-[-7px] md:-right-[16vw] z-0 hidden md:block"
      >
        <img
          src={snoop.src}
          alt=""
          className="max-h-[64vh] w-auto max-w-[34vw] lg:max-w-[29vw] xl:max-w-[24vw] origin-top-right scale-[2] object-contain opacity-85 [filter:grayscale(0.1)_contrast(1.05)] mix-blend-screen"
          loading="eager"
          decoding="async"
        />
      </div>
    </main>
  );
}
