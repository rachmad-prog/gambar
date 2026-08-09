const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Ambil URL koneksi dari Environment Variable Vercel
const DATABASE_URL = process.env.DATABASE_URL;

// Konfigurasi Pool yang aman untuk lingkungan Serverless Vercel & Neon DB
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 1, // Mencegah koneksi terlalu banyak di Serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 1. ENDPOINT SIMPAN LOKASI
app.post("/api/simpan-lokasi", async (req, res) => {
  const { latitude, longitude, akurasi_meter } = req.body || {};

  // Validasi input
  if (!latitude || !longitude) {
    return res.status(400).json({
      status: "error",
      message: "Koordinat latitude & longitude wajib diisi",
    });
  }

  // Gunakan ISO String agar format timestamp diterima oleh PostgreSQL Neon
  const waktu = new Date().toISOString();
  const akurasi = Math.round(akurasi_meter || 0);
  const maps = `https://www.google.com/maps?q=${latitude},${longitude}`;

  try {
    const query = `
      INSERT INTO riwayat_lokasi (waktu, latitude, longitude, akurasi_meter, maps)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [waktu, latitude, longitude, akurasi, maps]);

    return res.json({
      status: "success",
      message: "Lokasi berhasil disimpan ke database Neon!",
    });
  } catch (err) {
    console.error("Gagal simpan ke Neon DB:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

// 2. ENDPOINT LIHAT LOKASI (DASHBOARD ADMIN)
app.get("/api/lihat-lokasi", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM riwayat_lokasi ORDER BY id DESC",
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Gagal ambil data lokasi:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

// 3. ENDPOINT HAPUS LOKASI
app.delete("/api/hapus-lokasi", async (req, res) => {
  try {
    await pool.query("TRUNCATE TABLE riwayat_lokasi");
    return res.json({ status: "success" });
  } catch (err) {
    console.error("Gagal hapus data:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ROUTE HALAMAN HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

module.exports = app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Server berjalan di http://localhost:${PORT}`),
  );
}
