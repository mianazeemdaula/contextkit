import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";
import { Footer } from "@/components/marketing/Footer";

export const metadata = { title: "Pricing — ContextKit" };

/** Full pricing page including Enterprise card. */
export default function PricingPage() {
  return (
    <main>
      <Pricing full />
      <FAQ />
      <Footer />
    </main>
  );
}
