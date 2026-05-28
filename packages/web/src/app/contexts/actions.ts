"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";

type SaveInput = { id?: string; name: string; body: string };

/** Create or update a context. */
export async function saveContext(input: SaveInput): Promise<{ id: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    // Dev stub.
    return { id: input.id ?? "stub" };
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  if (input.id) {
    const { data, error } = await supabase
      .from("contexts")
      .update({ name: input.name, body: input.body, updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath(`/contexts/${data.id}`);
    revalidatePath("/dashboard");
    return { id: data.id };
  }

  const { data, error } = await supabase
    .from("contexts")
    .insert({ name: input.name, body: input.body, user_id: user.user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { id: data.id };
}
