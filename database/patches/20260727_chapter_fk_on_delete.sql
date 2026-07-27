-- Fix FK blocking chapter delete when scores/tasks still reference the chapter.
-- Scores: SET NULL (nullable chapter_id, keep historical grades).
-- Content/tasks: CASCADE (owned by chapter; task children already cascade from l_task).

BEGIN;

ALTER TABLE lms.l_content DROP CONSTRAINT IF EXISTS l_content_chapter_id_fkey;
ALTER TABLE lms.l_content
  ADD CONSTRAINT l_content_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES lms.l_chapter(id) ON DELETE CASCADE;

ALTER TABLE lms.l_score_formative DROP CONSTRAINT IF EXISTS l_score_formative_chapter_id_fkey;
ALTER TABLE lms.l_score_formative
  ADD CONSTRAINT l_score_formative_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES lms.l_chapter(id) ON DELETE SET NULL;

ALTER TABLE lms.l_score_summative DROP CONSTRAINT IF EXISTS l_score_summative_chapter_id_fkey;
ALTER TABLE lms.l_score_summative
  ADD CONSTRAINT l_score_summative_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES lms.l_chapter(id) ON DELETE SET NULL;

ALTER TABLE lms.l_task DROP CONSTRAINT IF EXISTS l_task_chapter_id_fkey;
ALTER TABLE lms.l_task
  ADD CONSTRAINT l_task_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES lms.l_chapter(id) ON DELETE CASCADE;

COMMIT;
