"use client";

import { useState } from "react";
import ui from "@/components/ui.module.css";

/** Tombol masuk dengan putaran kecil selama dialihkan ke Google. */
export default function TombolMasuk() {
  const [memuat, setMemuat] = useState(false);
  return (
    <a
      href="/api/auth/google"
      className={`${ui.tombol} ${ui.utama} ${ui.besar} ${ui.penuh}`}
      aria-busy={memuat}
      onClick={() => setMemuat(true)}
    >
      {memuat && <span className={ui.putar} aria-hidden />}
      Gunakan Email Corporate
    </a>
  );
}
