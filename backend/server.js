// =====================================================================
// Task Management API — Express.js Backend (for Render deployment)
// =====================================================================
// This server acts as a secure proxy between the frontend and Supabase.
// The Supabase service-role key is NEVER exposed to the client.
// =====================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Env Validation ──────────────────────────────────────────────────
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌  Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const SUPA_URL = process.env.SUPABASE_URL.replace(/\/$/, '');
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

const supaHeaders = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// ─── Middleware ───────────────────────────────────────────────────────
// Allow the Vercel frontend domain + localhost for dev
const allowedOrigins = [
  process.env.FRONTEND_URL,        // e.g. https://taskmgmt.vercel.app
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. curl / Render healthchecks)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin not allowed — ${origin}`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ─── Health Check (Render needs this) ────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── GET /api/tasks ───────────────────────────────────────────────────
app.get('/api/tasks', async (_req, res) => {
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/tasks?select=*&order=created_at.desc`, {
      headers: supaHeaders,
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    res.json(data);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/tasks ─────────────────────────────────────────────────
app.post('/api/tasks', async (req, res) => {
  const { task } = req.body;
  if (!task || typeof task !== 'string' || !task.trim()) {
    return res.status(400).json({ error: 'task field is required and must be a non-empty string' });
  }

  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/tasks`, {
      method: 'POST',
      headers: supaHeaders,
      body: JSON.stringify({ task: task.trim(), is_done: false }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { is_done } = req.body;

  if (typeof is_done !== 'boolean') {
    return res.status(400).json({ error: 'is_done must be a boolean' });
  }

  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/tasks?id=eq.${id}`, {
      method: 'PATCH',
      headers: supaHeaders,
      body: JSON.stringify({ is_done }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    res.json(data);
  } catch (err) {
    console.error(`PATCH /api/tasks/${id} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/tasks?id=eq.${id}`, {
      method: 'DELETE',
      headers: { ...supaHeaders, Prefer: 'return=minimal' },
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: data });
    }
    res.status(204).end();
  } catch (err) {
    console.error(`DELETE /api/tasks/${id} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 404 catch-all ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Task API running on port ${PORT}`);
  console.log(`   Supabase URL: ${SUPA_URL}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
});
