# Database

File migrasi (perubahan struktur database) disimpan di `migrations/` dan dibuat mulai **Tahap 2**.

Aturan (Standar Keamanan v1.2): semua tabel di skema `hcs`, RLS aktif tanpa policy (tolak semua), hak `anon`/`authenticated` dicabut, dan perubahan hanya lewat file migrasi yang direview.
