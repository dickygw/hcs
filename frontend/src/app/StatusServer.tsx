"use client";

import { useEffect, useState } from "react";
import styles from "./StatusServer.module.css";

type Status = "memeriksa" | "terhubung" | "terputus";

const teks: Record<Status, string> = {
  memeriksa: "Memeriksa server…",
  terhubung: "Server terhubung",
  terputus: "Server belum berjalan",
};

/** Lencana kecil untuk memastikan tampilan dan server sudah tersambung (uji Tahap 1). */
export default function StatusServer() {
  const [status, setStatus] = useState<Status>("memeriksa");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { status?: string }) => setStatus(data.status === "ok" ? "terhubung" : "terputus"))
      .catch(() => setStatus("terputus"));
  }, []);

  return (
    <span className={`${styles.lencana} ${styles[status]}`} role="status">
      {teks[status]}
    </span>
  );
}
