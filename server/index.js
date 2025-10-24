/* eslint-env node */

import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const timeStamp = Date.now();
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${timeStamp}-${safeOriginalName}`);
  },
});

const audioMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/aac",
  "audio/flac",
  "audio/ogg",
]);

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (audioMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported audio format"));
    }
  },
});

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/upload", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  const protocol = req.protocol;
  const host = req.get("host");
  const audioUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  res.status(201).json({
    audioUrl,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error("Upload error", err);
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  return next();
});

const envPort = globalThis.process?.env?.PORT;
const PORT = envPort ? Number(envPort) : 5000;

app.listen(PORT, () => {
  console.log(`File upload server listening on port ${PORT}`);
});
