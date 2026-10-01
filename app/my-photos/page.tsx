import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function MyPhotosPage() {
  const session = await getSession();

  if (!session || !session.handle) {
    redirect("/");
  }

  redirect(`/users/${session.handle}`);
}
