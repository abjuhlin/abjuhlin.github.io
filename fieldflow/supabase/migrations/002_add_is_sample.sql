-- Migration: 002_add_is_sample.sql
-- Adds is_sample flag to tables so demo/sample data can be loaded and removed cleanly.

ALTER TABLE customers  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE proposals  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jobs       ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invoices   ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
