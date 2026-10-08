import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
// Bawaan 127.0.0.1: server hanya bisa diakses dari mesin yang sama (lewat Next.js), tidak langsung dari internet.
const host = process.env.HOST ?? "127.0.0.1";

createApp().listen(port, host, () => {
  console.log(`Server HCS berjalan di http://${host}:${port}`);
});
