const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const FILE_LOG = path.join(__dirname, "lokasi_log.json");

// 1. ENDPOINT PENERIMA LOKASI (Dipanggil oleh index.html)
app.post("/api/simpan-lokasi", (req, res) => {
  const { latitude, longitude, akurasi_meter } = req.body;

  const dataBaru = {
    waktu: new Date().toLocaleString("id-ID"),
    latitude,
    longitude,
    akurasi_meter: Math.round(akurasi_meter),
    maps: `https://www.google.com/maps?q=${latitude},${longitude}`,
  };

  // Baca file JSON lama
  let logs = [];
  if (fs.existsSync(FILE_LOG)) {
    try {
      logs = JSON.parse(fs.readFileSync(FILE_LOG, "utf8"));
    } catch (e) {
      logs = [];
    }
  }

  // Tambahkan data baru di awal baris
  logs.unshift(dataBaru);

  // Simpan kembali ke file
  fs.writeFileSync(FILE_LOG, JSON.stringify(logs, null, 2));

  res.json({ status: "success", message: "Lokasi tersimpan" });
});

// 2. ENDPOINT LIHAT LOKASI (Dipanggil oleh admin.html)
app.get("/api/lihat-lokasi", (req, res) => {
  if (fs.existsSync(FILE_LOG)) {
    try {
      const logs = JSON.parse(fs.readFileSync(FILE_LOG, "utf8"));
      return res.json(logs);
    } catch (e) {
      return res.json([]);
    }
  }
  res.json([]);
});

// 3. ENDPOINT HAPUS LOKASI
app.delete("/api/hapus-lokasi", (req, res) => {
  fs.writeFileSync(FILE_LOG, JSON.stringify([], null, 2));
  res.json({ status: "success" });
});

// ROUTE HALAMAN UTAMA & ADMIN
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(3000, () => {
  console.log("Server berjalan di http://localhost:3000");
});
