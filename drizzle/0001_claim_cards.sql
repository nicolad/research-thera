-- Migration: Add claim cards tables
-- Date: 2026-02-04

-- Claim cards table: stores verified/unverified claims with evidence
CREATE TABLE IF NOT EXISTS claim_cards (
  id TEXT PRIMARY KEY,
  note_id INTEGER,
  claim TEXT NOT NULL,
  scope TEXT, -- JSON: { population?, intervention?, comparator?, outcome?, timeframe?, setting? }
  verdict TEXT NOT NULL CHECK(verdict IN ('unverified', 'supported', 'contradicted', 'mixed', 'insufficient')),
  confidence INTEGER NOT NULL CHECK(confidence >= 0 AND confidence <= 100),
  evidence TEXT NOT NULL, -- JSON array of EvidenceItem[]
  queries TEXT NOT NULL, -- JSON array of search queries
  provenance TEXT NOT NULL, -- JSON: { generatedBy, model?, sourceTools[] }
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for note lookups
CREATE INDEX IF NOT EXISTS idx_claim_cards_note_id ON claim_cards(note_id);

-- Index for verdict filtering
CREATE INDEX IF NOT EXISTS idx_claim_cards_verdict ON claim_cards(verdict);

-- Notes to claims linking table
CREATE TABLE IF NOT EXISTS notes_claims (
  note_id INTEGER NOT NULL,
  claim_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (note_id, claim_id)
);

-- Indexes for linking table
CREATE INDEX IF NOT EXISTS idx_notes_claims_note_id ON notes_claims(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_claims_claim_id ON notes_claims(claim_id);
