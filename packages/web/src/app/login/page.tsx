import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in — ContextKit" };

/** Magic-link login page. */
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="font-serif text-3xl font-bold text-gray-900">Log in</h1>
      <p className="mt-2 text-gray-700">
        We&rsquo;ll email you a magic link. No password needed.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
