import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("Kerangka server HCS", () => {
  it("pemeriksaan kesehatan menjawab ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("alamat tidak dikenal ditolak dengan pesan umum", async () => {
    const res = await request(app).get("/api/rahasia");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ pesan: "Halaman tidak ditemukan." });
  });

  it("header keamanan aktif dan identitas server disembunyikan", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("isi permintaan rusak tidak membocorkan detail teknis", async () => {
    const res = await request(app)
      .post("/api/apa-saja")
      .set("Content-Type", "application/json")
      .send("{ini bukan json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ pesan: "Permintaan tidak dapat diproses." });
    expect(JSON.stringify(res.body)).not.toMatch(/stack|SyntaxError/);
  });

  it("isi permintaan terlalu besar ditolak", async () => {
    const res = await request(app)
      .post("/api/apa-saja")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ isi: "x".repeat(200_000) }));
    expect(res.status).toBe(413);
  });
});
