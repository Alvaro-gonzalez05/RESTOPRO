"use server"
import { revalidatePath } from "next/cache"
export async function revalidateOrdersPath() {
  revalidatePath("/dashboard/ordenes")
}
