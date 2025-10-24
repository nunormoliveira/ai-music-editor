/* eslint-env node */

import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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

const MB = 1024 * 1024;

const PLAN_LIMITS = {
  free: {
    key: "free",
    name: "Free",
    maxUploadBytes: 20 * MB,
    maxMonthlyRenders: 25,
    signedUrlTtlSeconds: 60 * 30,
  },
  pro: {
    key: "pro",
    name: "Pro",
    maxUploadBytes: 200 * MB,
    maxMonthlyRenders: 250,
    signedUrlTtlSeconds: 60 * 60,
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    maxUploadBytes: 512 * MB,
    maxMonthlyRenders: Infinity,
    signedUrlTtlSeconds: 60 * 60 * 24,
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FILE_SIGNING_SECRET =
  process.env.FILE_SIGNING_SECRET || process.env.SUPABASE_FILE_SIGNING_SECRET || SUPABASE_SERVICE_ROLE_KEY || "local-secret";
const SIGNED_URL_TTL_SECONDS = Number(process.env.FILE_SIGNED_URL_TTL_SECONDS || 60 * 30);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Supabase credentials are not fully configured. Authentication and plan enforcement will not work as expected."
  );
}

function createUploadMiddleware(maxUploadBytes) {
  return multer({
    storage,
    limits: { fileSize: maxUploadBytes },
    fileFilter: (req, file, cb) => {
      if (audioMimeTypes.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Unsupported audio format"));
      }
    },
  });
}

function getPlanLimits(planKey) {
  if (!planKey) return PLAN_LIMITS.free;
  const limits = PLAN_LIMITS[planKey];
  if (!limits) return PLAN_LIMITS.free;
  return limits;
}

function sanitizePlanLimits(limits) {
  return {
    ...limits,
    maxMonthlyRenders: Number.isFinite(limits.maxMonthlyRenders) ? limits.maxMonthlyRenders : null,
  };
}

function buildSignedDownloadUrl(filename, req, ttlSeconds = SIGNED_URL_TTL_SECONDS) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${filename}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", FILE_SIGNING_SECRET).update(payload).digest("hex");
  const protocol = req.protocol;
  const host = req.get("host");
  return {
    url: `${protocol}://${host}/api/download/${encodeURIComponent(filename)}?expires=${expiresAt}&token=${signature}`,
    expiresAt,
  };
}

async function fetchSupabaseUser(accessToken) {
  if (!accessToken || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!response.ok) {
    return null;
  }

  const body = await response.json();
  return body;
}

async function fetchProfile(userId) {
  if (!userId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  url.searchParams.set("id", `eq.${userId}`);
  url.searchParams.set("select", "id,plan,role,monthly_render_count,monthly_render_limit,upload_override_bytes");

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });

  if (!response.ok) {
    console.error("Unable to fetch profile", await response.text());
    return null;
  }

  const profiles = await response.json();
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return null;
  }

  return profiles[0];
}

async function ensureProfile(user) {
  if (!user || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const existingProfile = await fetchProfile(user.id);
  if (existingProfile) {
    return existingProfile;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      plan: "free",
      role: "user",
      monthly_render_count: 0,
      monthly_render_limit: PLAN_LIMITS.free.maxMonthlyRenders,
      upload_override_bytes: null,
    }),
  });

  if (!response.ok) {
    console.error("Unable to provision profile", await response.text());
    return null;
  }

  const body = await response.json();
  return Array.isArray(body) ? body[0] : body;
}

async function incrementRenderCount(userId, currentCount) {
  if (!userId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const nextCount = typeof currentCount === "number" ? currentCount + 1 : 1;

  const url = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  url.searchParams.set("id", `eq.${userId}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ monthly_render_count: nextCount }),
  });

  if (!response.ok) {
    console.error("Failed to increment render count", await response.text());
    return null;
  }

  const body = await response.json();
  return Array.isArray(body) ? body[0] : body;
}

async function authenticateRequest(req, res, next) {
  try {
    const authHeader = req.get("authorization") || req.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      return res.status(401).json({ error: "Invalid authorization header" });
    }

    const supabaseUser = await fetchSupabaseUser(accessToken);
    if (!supabaseUser?.id) {
      return res.status(401).json({ error: "Invalid access token" });
    }

    const profile = (await ensureProfile(supabaseUser)) || { plan: "free", role: "user" };
    const planLimits = getPlanLimits(profile.plan);

    const uploadOverrideBytes = profile.upload_override_bytes;
    const effectiveMaxUploadBytes =
      typeof uploadOverrideBytes === "number" && uploadOverrideBytes > 0 ? uploadOverrideBytes : planLimits.maxUploadBytes;
    const profileRenderLimit = profile.monthly_render_limit;
    const effectiveMaxRenders =
      typeof profileRenderLimit === "number" && profileRenderLimit >= 0
        ? profileRenderLimit
        : planLimits.maxMonthlyRenders;

    req.auth = {
      user: supabaseUser,
      profile,
      plan: profile.plan,
      role: profile.role,
      planLimits: {
        ...planLimits,
        maxUploadBytes: effectiveMaxUploadBytes,
        maxMonthlyRenders: effectiveMaxRenders,
        signedUrlTtlSeconds: planLimits.signedUrlTtlSeconds || SIGNED_URL_TTL_SECONDS,
      },
      accessToken,
    };

    return next();
  } catch (error) {
    console.error("Authentication failure", error);
    return res.status(500).json({ error: "Failed to authenticate request" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth?.role) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (allowedRoles.length === 0 || allowedRoles.includes(req.auth.role)) {
      return next();
    }
    return res.status(403).json({ error: "Insufficient permissions" });
  };
}

function verifySignature(filename, expires, token) {
  if (!expires || !token) return false;
  const expiresNumber = Number(expires);
  if (!Number.isFinite(expiresNumber) || expiresNumber < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${filename}:${expiresNumber}`;
  const expected = crypto.createHmac("sha256", FILE_SIGNING_SECRET).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch (error) {
    return false;
  }
}

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/plan-limits", (req, res) => {
  res.json({
    plans: Object.values(PLAN_LIMITS).map((plan) => ({
      key: plan.key,
      name: plan.name,
      maxUploadBytes: plan.maxUploadBytes,
      maxMonthlyRenders: Number.isFinite(plan.maxMonthlyRenders) ? plan.maxMonthlyRenders : null,
      signedUrlTtlSeconds: plan.signedUrlTtlSeconds,
    })),
    hasSupabase: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
  });
});

app.post("/api/upload", authenticateRequest, (req, res) => {
  const planLimits = req.auth?.planLimits || PLAN_LIMITS.free;
  const currentRenderCount = req.auth?.profile?.monthly_render_count;

  if (
    Number.isFinite(planLimits.maxMonthlyRenders) &&
    typeof currentRenderCount === "number" &&
    currentRenderCount >= planLimits.maxMonthlyRenders
  ) {
    return res.status(429).json({
      error: "Monthly render limit reached for your current plan. Upgrade to continue rendering.",
    });
  }

  const upload = createUploadMiddleware(planLimits.maxUploadBytes);

  upload.single("audio")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: `File is too large for your current plan. Limit: ${Math.round(planLimits.maxUploadBytes / MB)}MB`,
        });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      console.error("Upload middleware error", err);
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const { url, expiresAt } = buildSignedDownloadUrl(
      req.file.filename,
      req,
      req.auth?.planLimits?.signedUrlTtlSeconds || SIGNED_URL_TTL_SECONDS
    );

    const updatedProfile = await incrementRenderCount(req.auth?.user?.id, currentRenderCount);
    const nextRenderCount = updatedProfile?.monthly_render_count ?? currentRenderCount;

    const responsePlanLimits = sanitizePlanLimits({
      ...planLimits,
      monthlyRenderCount: nextRenderCount,
      signedUrlTtlSeconds: req.auth?.planLimits?.signedUrlTtlSeconds || SIGNED_URL_TTL_SECONDS,
    });

    return res.status(201).json({
      audioUrl: url,
      expiresAt,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      plan: req.auth?.plan || "free",
      planLimits: responsePlanLimits,
    });
  });
});

app.get("/api/download/:fileName", (req, res) => {
  const { fileName } = req.params;
  const { expires, token } = req.query;

  if (!verifySignature(fileName, expires, token)) {
    return res.status(403).json({ error: "Invalid or expired download token" });
  }

  const filePath = path.join(uploadsDir, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  return res.sendFile(filePath);
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
