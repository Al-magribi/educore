import bcrypt from "bcrypt";
import pool from "../../config/connection.js";

const MIN_PASSWORD_LENGTH = 6;

let ensureSchemaPromise = null;

export const ensureStaffAccountSchema = async () => {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = pool
      .query(
        `
          DO $$
          DECLARE
            constraint_name text;
          BEGIN
            FOR constraint_name IN
              SELECT con.conname
              FROM pg_constraint con
              WHERE con.conrelid = 'public.u_users'::regclass
                AND con.contype = 'c'
                AND pg_get_constraintdef(con.oid) ILIKE '%role%'
                AND pg_get_constraintdef(con.oid) NOT ILIKE '%''staff''%'
            LOOP
              EXECUTE format('ALTER TABLE public.u_users DROP CONSTRAINT %I', constraint_name);
            END LOOP;

            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint con
              WHERE con.conrelid = 'public.u_users'::regclass
                AND con.contype = 'c'
                AND pg_get_constraintdef(con.oid) ILIKE '%''staff''%'
            ) THEN
              ALTER TABLE public.u_users
                ADD CONSTRAINT u_users_role_check
                CHECK (role IN ('student', 'teacher', 'admin', 'parent', 'center', 'staff'));
            END IF;

            IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'u_staff'
                AND column_name = 'user_id'
            ) THEN
              ALTER TABLE public.u_staff
                ADD COLUMN user_id INT REFERENCES public.u_users(id) ON DELETE SET NULL;
            END IF;

            IF to_regclass('public.uq_u_staff_user_id') IS NULL THEN
              CREATE UNIQUE INDEX uq_u_staff_user_id
                ON public.u_staff (user_id)
                WHERE user_id IS NOT NULL;
            END IF;
          END $$;
        `,
      )
      .catch((error) => {
        ensureSchemaPromise = null;
        throw error;
      });
  }

  await ensureSchemaPromise;
};

export const readAccountPayload = (body = {}) => ({
  username: String(body.account_username || "").trim(),
  password: String(body.account_password || "").trim(),
});

const validateAccount = ({ username, password }, hasAccount) => {
  if (!username && !password) return null;
  if (!username) return "Username akun wajib diisi.";
  if (username.length > 100) return "Username maksimal 100 karakter.";
  if (/\s/.test(username)) return "Username tidak boleh mengandung spasi.";
  if (!hasAccount && !password) return "Password akun baru wajib diisi.";
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  return null;
};

export const saveStaffAccount = async (client, staff, account) => {
  const hasAccount = Boolean(staff.user_id);
  const error = validateAccount(account, hasAccount);
  if (error) return { error };

  if (!account.username) {
    if (hasAccount) {
      await client.query(
        `UPDATE public.u_users SET full_name = $1, is_active = $2 WHERE id = $3 AND role = 'staff'`,
        [staff.full_name, staff.is_active, staff.user_id],
      );
    }
    return { userId: staff.user_id || null };
  }

  const taken = await client.query(
    `SELECT 1 FROM public.u_users WHERE username = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
    [account.username, staff.user_id || null],
  );
  if (taken.rowCount > 0) {
    return { error: "Username sudah dipakai akun lain." };
  }

  const hashedPassword = account.password
    ? await bcrypt.hash(account.password, 10)
    : null;

  if (hasAccount) {
    await client.query(
      `
        UPDATE public.u_users
        SET username = $1,
            full_name = $2,
            is_active = $3,
            password = COALESCE($4, password)
        WHERE id = $5 AND role = 'staff'
      `,
      [
        account.username,
        staff.full_name,
        staff.is_active,
        hashedPassword,
        staff.user_id,
      ],
    );
    return { userId: staff.user_id };
  }

  const created = await client.query(
    `
      INSERT INTO public.u_users (username, password, full_name, role, is_active)
      VALUES ($1, $2, $3, 'staff', $4)
      RETURNING id
    `,
    [account.username, hashedPassword, staff.full_name, staff.is_active],
  );
  const userId = created.rows[0].id;
  await client.query(`UPDATE public.u_staff SET user_id = $1 WHERE id = $2`, [
    userId,
    staff.id,
  ]);
  return { userId };
};

// Akun yang sudah tercatat di transaksi keuangan tidak bisa dihapus, jadi dinonaktifkan.
export const deleteStaffAccount = async (client, userId) => {
  if (!userId) return;
  await client.query("SAVEPOINT staff_account_delete");
  try {
    await client.query(
      `DELETE FROM public.u_users WHERE id = $1 AND role = 'staff'`,
      [userId],
    );
    await client.query("RELEASE SAVEPOINT staff_account_delete");
  } catch {
    await client.query("ROLLBACK TO SAVEPOINT staff_account_delete");
    await client.query(
      `UPDATE public.u_users SET is_active = false WHERE id = $1 AND role = 'staff'`,
      [userId],
    );
  }
};
