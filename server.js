const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Ambil URL koneksi murni dari Environment Variable Vercel / .env
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Diperlukan untuk koneksi aman Neon
});

// 1. ENDPOINT SIMPAN LOKASI
app.post("/api/simpan-lokasi", async (req, res) => {
  const { latitude, longitude, akurasi_meter } = req.body;

  // Validasi data agar tidak memasukkan nilai kosong
  if (!latitude || !longitude) {
    return res
      .status(400)
      .json({
        status: "error",
        message: "Koordinat latitude & longitude wajib diisi",
      });
  }

  // Gunakan ISO String agar kompatibel dengan TIMESTAMP PostgreSQL
  const waktu = new Date().toISOString();
  const akurasi = Math.round(akurasi_meter || 0);
  const maps = `https://www.google.com/maps?q=${latitude},${longitude}`;

  try {
    const query = `
      INSERT INTO riwayat_lokasi (waktu, latitude, longitude, akurasi_meter, maps)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [waktu, latitude, longitude, akurasi, maps]);

    res.json({
      status: "success",
      message: "Lokasi berhasil disimpan ke Neon",
    });
  } catch (err) {
    console.error("Gagal simpan ke Neon:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 2. ENDPOINT LIHAT LOKASI
app.get("/api/lihat-lokasi", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM riwayat_lokasi ORDER BY id DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Gagal ambil data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 3. ENDPOINT HAPUS LOKASI
app.delete("/api/hapus-lokasi", async (req, res) => {
  try {
    await pool.query("TRUNCATE TABLE riwayat_lokasi");
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ROUTE HALAMAN
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

module.exports = app;

if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () =>
    console.log("Server lokal berjalan di http://localhost:3000"),
  );
}
