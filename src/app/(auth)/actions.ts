"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { insertOwnCastingSignup } from "@/src/lib/casting/join";
import { createClient } from "@/src/lib/supabase/server";

export async function login(formData: FormData): Promise<string | undefined> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data: signedIn, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return "Login fehlgeschlagen. Bitte überprüfe deine Daten.";
  }

  if (formData.get("casting") === "1" && signedIn.user) {
    await insertOwnCastingSignup(supabase as any, signedIn.user.id);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData): Promise<string | undefined> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  if (!username || username.length < 3) {
    return "Der Benutzername muss mindestens 3 Zeichen lang sein.";
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username, // WICHTIG für DB Trigger
        ...(formData.get("casting") === "1" ? { casting_call: "call-to-adventure" } : {}),
      },
    },
  });

  if (error) {
    return `Registrierung fehlgeschlagen: ${error.message}`;
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}
