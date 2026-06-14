-- Add `contact` to HomeSectionType (idempotent on PostgreSQL 9.1+)
ALTER TYPE "HomeSectionType" ADD VALUE IF NOT EXISTS 'contact';
