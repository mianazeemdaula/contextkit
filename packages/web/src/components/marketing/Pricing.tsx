import Link from "next/link";
import { Button } from "@/components/ui/Button";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "",
    blurb: "For people trying it out.",
    points: [
      "Save up to 5 prompts",
      "One-click paste into every major AI tool",
      "Works on this computer",
      "Email support"
    ],
    cta: "Start free",
    popular: false
  },
  {
    name: "Personal",
    price: "$7",
    cadence: "/ month",
    blurb: "For freelancers, students, and daily AI users.",
    points: [
      "Save up to 50 prompts",
      "Sync across your laptop and phone",
      "Roll back to any older version",
      "Priority email support"
    ],
    cta: "Try Personal free for 14 days",
    popular: true
  },
  {
    name: "Team",
    price: "$19",
    cadence: "/ user / month",
    blurb: "For small teams that want one shared voice.",
    points: [
      "Everything in Personal",
      "Share prompt libraries with your team",
      "Admin controls and member roles",
      "See which prompts get used most"
    ],
    cta: "Start a team trial",
    popular: false
  }
];

type Props = { full?: boolean };

/** Pricing block — copy from landing/COPY.md section 8. */
export function Pricing({ full = false }: Props) {
  return (
    <section className="bg-gray-50 py-20" id="pricing">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-serif text-3xl font-bold text-gray-900 md:text-4xl">
          Simple pricing. Start free.
        </h2>
        <p className="mt-3 text-center text-lg text-gray-700">
          Pay only when you want your prompts on every device.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
                t.popular ? "border-accent-500 ring-2 ring-accent-500" : "border-gray-200"
              }`}
            >
              {t.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent-600 px-3 py-1 text-xs font-semibold uppercase text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-semibold text-gray-900">{t.name}</h3>
              <p className="mt-2 text-sm text-gray-600">{t.blurb}</p>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gray-900">{t.price}</span>
                <span className="ml-1 text-gray-600">{t.cadence}</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-gray-700">
                {t.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden className="text-accent-600">
                      ✓
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link href="/login">
                  <Button variant={t.popular ? "primary" : "secondary"} className="w-full">
                    {t.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-600">
          Need SSO, audit logs, or on-prem? See our Enterprise plan ($79/user/mo).
        </p>
        {full && (
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-xl font-semibold text-gray-900">Enterprise — $79 / user / month</h3>
            <p className="mt-2 text-gray-700">
              SSO, audit logs, custom data residency, and a named success manager. Contact sales
              for on-prem.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
