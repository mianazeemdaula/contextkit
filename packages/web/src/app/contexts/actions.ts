"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

type SaveInput = { id?: string; name: string; body: string };

/**
 * Create or update a context. On every save, also writes an immutable
 * snapshot row into `context_versions` (best-effort — failures only log).
 */
export async function saveContext(input: SaveInput): Promise<{ id: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    // Dev stub.
    return { id: input.id ?? "stub" };
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  if (input.id) {
    // Bump server version atomically by reading + writing version+1.
    const { data: prev } = await supabase
      .from("contexts")
      .select("version")
      .eq("id", input.id)
      .single();
    const nextVersion = (prev?.version ?? 1) + 1;

    const { data, error } = await supabase
      .from("contexts")
      .update({
        name: input.name,
        body: input.body,
        version: nextVersion,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    try {
      await supabase.from("context_versions").insert({
        context_id: data.id,
        body: input.body,
        version: nextVersion,
        created_by: user.user.id
      });
    } catch {
      // Versioning is best-effort.
    }

    revalidatePath(`/contexts/${data.id}`);
    revalidatePath(`/contexts/${data.id}/versions`);
    revalidatePath("/dashboard");
    return { id: data.id };
  }

  const { data, error } = await supabase
    .from("contexts")
    .insert({ name: input.name, body: input.body, user_id: user.user.id, version: 1 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  try {
    await supabase.from("context_versions").insert({
      context_id: data.id,
      body: input.body,
      version: 1,
      created_by: user.user.id
    });
  } catch {
    // ignore
  }

  revalidatePath("/dashboard");
  return { id: data.id };
}

/**
 * Restore a previous snapshot into the current context body and create a
 * new version entry that records the restore.
 */
export async function restoreVersion(formData: FormData): Promise<void> {
  const contextId = String(formData.get("contextId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!contextId || !versionId) throw new Error("Missing contextId or versionId");

  const supabase = await getServerSupabase();
  if (!supabase) {
    // Dev stub: just redirect.
    redirect(`/contexts/${contextId}`);
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  const { data: snapshot, error: snapErr } = await supabase
    .from("context_versions")
    .select("body")
    .eq("id", versionId)
    .single();
  if (snapErr || !snapshot) throw new Error(snapErr?.message ?? "Snapshot not found");

  const { data: prev } = await supabase
    .from("contexts")
    .select("version")
    .eq("id", contextId)
    .single();
  const nextVersion = (prev?.version ?? 1) + 1;

  const { error: updErr } = await supabase
    .from("contexts")
    .update({
      body: snapshot.body,
      version: nextVersion,
      updated_at: new Date().toISOString()
    })
    .eq("id", contextId);
  if (updErr) throw new Error(updErr.message);

  try {
    await supabase.from("context_versions").insert({
      context_id: contextId,
      body: snapshot.body,
      version: nextVersion,
      created_by: user.user.id
    });
  } catch {
    // best-effort
  }

  revalidatePath(`/contexts/${contextId}`);
  revalidatePath(`/contexts/${contextId}/versions`);
  redirect(`/contexts/${contextId}`);
}

/**
 * importTemplate — clone a bundled template into a new context for the
 * authenticated user. Slug is derived from the template name with a
 * `-1`, `-2`, … suffix on collision. Redirects to the new context.
 */
export async function importTemplate(templateName: string): Promise<void> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect("/login?next=/templates");
  }
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    redirect("/login?next=/templates");
  }

  // Load the template body from /templates/<name>.md at runtime.
  const fs = await import("node:fs");
  const path = await import("node:path");
  const candidates = [
    path.resolve(process.cwd(), "../../templates", `${templateName}.md`),
    path.resolve(process.cwd(), "templates", `${templateName}.md`)
  ];
  let body = `# ${templateName}\n\n`;
  for (const p of candidates) {
    try {
      body = fs.readFileSync(p, "utf8");
      break;
    } catch {
      // try next
    }
  }

  // Find a non-colliding slug.
  const base = templateName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  let slug = base;
  for (let i = 1; i < 50; i++) {
    const { data: existing } = await supabase
      .from("contexts")
      .select("id")
      .eq("user_id", user.user!.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${i}`;
  }

  const { data, error } = await supabase
    .from("contexts")
    .insert({
      user_id: user.user!.id,
      name: templateName.replace(/-/g, " "),
      slug,
      body,
      version: 1
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect(`/contexts/${data.id}`);
}
