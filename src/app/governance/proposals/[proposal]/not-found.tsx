import Link from "next/link";

export default function ProposalNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-subtle">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Proposal not found</h1>
      <p className="mt-2 text-muted">
        This address is not a valid public key or is not a proposal of the Marinade DAO realm.
      </p>
      <Link href="/governance" className="mt-6 inline-block text-accent hover:underline">
        Browse proposals →
      </Link>
    </div>
  );
}
