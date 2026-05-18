-- =====================================================================
-- SUPABASE DATABASE SETUP — Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- =====================================================================

-- Create the tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- Auto-incrementing unique ID
  task       TEXT NOT NULL,                                      -- The task description (required)
  is_done    BOOLEAN DEFAULT FALSE,                              -- Completion status
  created_at TIMESTAMPTZ DEFAULT NOW()                           -- Timestamp of creation
);

-- Enable Row Level Security (RLS) — required by Supabase
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write access (for demo/hackathon purposes)
-- In production, restrict these policies to authenticated users
CREATE POLICY "Allow public read"   ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON tasks FOR DELETE USING (true);
