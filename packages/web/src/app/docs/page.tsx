import { redirect } from "next/navigation";

/** Redirect /docs to the public GitHub docs folder. */
export default function DocsPage() {
  redirect("https://github.com/contextkit/contextkit/tree/main/docs");
}
