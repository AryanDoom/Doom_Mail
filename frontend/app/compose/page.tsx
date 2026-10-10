import { ComposeForm } from "@/components/ComposeForm";

export default function ComposePage() {
  return (
    <main className="mx-auto w-full max-w-[78rem] px-6 pt-12 pb-16 md:px-10 md:pt-10 lg:px-14">
      <div className="max-w-[52rem]">
        <h1 className="label">Compose</h1>

        <div className="mt-5">
          <ComposeForm />
        </div>
      </div>
    </main>
  );
}