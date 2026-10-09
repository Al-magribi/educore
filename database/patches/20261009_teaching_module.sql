-- Modul ajar guru per mapel + tingkat, lintas periode dan tidak terikat bab.
-- source_type 'created' menyimpan isi form di content (jsonb);
-- 'uploaded' menyimpan file PDF/DOC/DOCX di server/assets/lms/{teacher_id}/modul.

BEGIN;

CREATE TABLE IF NOT EXISTS lms.l_teaching_module (
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL,
    grade_id integer,
    title text NOT NULL,
    source_type character varying(20) NOT NULL,
    content jsonb,
    file_url text,
    file_name text,
    file_size integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT l_teaching_module_homebase_id_fkey
        FOREIGN KEY (homebase_id) REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    CONSTRAINT l_teaching_module_teacher_id_fkey
        FOREIGN KEY (teacher_id) REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    CONSTRAINT l_teaching_module_subject_id_fkey
        FOREIGN KEY (subject_id) REFERENCES public.a_subject(id) ON DELETE CASCADE,
    CONSTRAINT l_teaching_module_grade_id_fkey
        FOREIGN KEY (grade_id) REFERENCES public.a_grade(id) ON DELETE SET NULL,
    CONSTRAINT l_teaching_module_title_check CHECK (length(btrim(title)) > 0),
    CONSTRAINT l_teaching_module_source_type_check CHECK (
        source_type::text = ANY (
            ARRAY['created'::character varying::text, 'uploaded'::character varying::text]
        )
    ),
    CONSTRAINT l_teaching_module_payload_check CHECK (
        (source_type::text = 'created' AND content IS NOT NULL)
        OR (source_type::text = 'uploaded' AND file_url IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_teaching_module_teacher_subject
    ON lms.l_teaching_module (teacher_id, subject_id, grade_id);

CREATE INDEX IF NOT EXISTS idx_teaching_module_homebase
    ON lms.l_teaching_module (homebase_id, subject_id, teacher_id);

COMMIT;
