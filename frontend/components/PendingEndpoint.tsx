// small info pages for parts of the app that use different data or still need their own model
export function PendingEndpoint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[78rem] px-6 pt-20 pb-24 md:px-10 md:pt-16 lg:px-14">
      <div className="max-w-[34rem]">
        <h1 className="label">{title}</h1>

        <p className="mt-5 border-t border-ink/[0.09] pt-5 text-[14px] leading-relaxed text-muted">
          {children}
        </p>
      </div>
    </main>
  );
}
