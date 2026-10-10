import { EmailWorkspace } from "@/components/EmailWorkspace";

export default function EmailsPage() {
  return (
    <main className="mx-auto w-full max-w-[78rem] px-6 pt-20 pb-24 md:px-10 md:pt-16 lg:px-14">
      <div className="max-w-[58rem]">
        <EmailWorkspace />
      </div>
    </main>
  );
}