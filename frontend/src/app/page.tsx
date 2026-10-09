"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, BERANDA, type Peran } from "@/lib/api";

/** Pintu masuk: arahkan ke beranda sesuai peran, atau ke U1 bila belum masuk. */
export default function Beranda() {
  const router = useRouter();
  useEffect(() => {
    api("/api/auth/sesi")
      .then(async (res) => {
        if (!res.ok) return router.replace("/masuk");
        const { pengguna }: { pengguna: { peran: Peran } } = await res.json();
        router.replace(BERANDA[pengguna.peran]);
      })
      .catch(() => router.replace("/masuk"));
  }, [router]);
  return null;
}
