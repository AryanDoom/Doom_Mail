export function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      <img
        src="/main_back.jpg"
        alt=""
        className="h-full w-full object-cover [filter:brightness(0.48)]"
        loading="eager"
        decoding="async"
        style={{ transform: "translate3d(0,0,0)" }}
      />
      <div className="absolute inset-0 bg-black/42" />
      <div className="absolute inset-0 bg-black/30 md:hidden" />
    </div>
  );
}