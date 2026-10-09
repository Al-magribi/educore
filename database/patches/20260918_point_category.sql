-- Kategori rule poin (penghargaan / pelanggaran) per satuan dan periode.
-- Rule lama tetap valid tanpa kategori; admin/kesiswaan mengelompokkan belakangan.

CREATE TABLE IF NOT EXISTS lms.l_point_category (
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    point_type character varying(20) NOT NULL,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT l_point_category_homebase_id_fkey
        FOREIGN KEY (homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_point_category_periode_id_fkey
        FOREIGN KEY (periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_point_category_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL,
    CONSTRAINT l_point_category_name_check CHECK (length(btrim(name)) > 0),
    CONSTRAINT l_point_category_sort_order_check CHECK (sort_order > 0),
    CONSTRAINT l_point_category_type_check CHECK (
        point_type::text = ANY (
            ARRAY[
                'reward'::character varying::text,
                'punishment'::character varying::text
            ]
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_category_name_periode
    ON lms.l_point_category (homebase_id, periode_id, point_type, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_point_category_lookup
    ON lms.l_point_category (homebase_id, periode_id, point_type, sort_order, id);

ALTER TABLE lms.l_point_rule
    ADD COLUMN IF NOT EXISTS category_id integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'l_point_rule_category_id_fkey'
    ) THEN
        ALTER TABLE lms.l_point_rule
            ADD CONSTRAINT l_point_rule_category_id_fkey
            FOREIGN KEY (category_id)
            REFERENCES lms.l_point_category(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_point_rule_category
    ON lms.l_point_rule (category_id);
