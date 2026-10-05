import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-subtle">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <Link href="/governance" className="mt-6 inline-block text-accent hover:underline">
        Browse proposals →
      </Link>
    </div>
  );
}
