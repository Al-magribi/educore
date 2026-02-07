import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiDatabase = createApi({
  reducerPath: "ApiDatabase",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }), // Pastikan prefix ini sesuai dengan server.js Anda
  tagTypes: ["Database", "Backups"],
  endpoints: (builder) => ({
    // 1. Ambil List Tabel
    getTables: builder.query({
      query: () => ({
        url: "/get-tables",
        method: "GET",
      }),
      providesTags: ["Database"],
    }),

    // 2. Reset/Kosongkan Tabel Terpilih
    resetTables: builder.mutation({
      query: (payload) => ({
        url: "/reset-tables",
        method: "DELETE",
        body: payload, // { tables: [...] }
      }),
      invalidatesTags: ["Database"], // Refresh data jika perlu
    }),

    // 3. Ambil List File Backup
    getBackups: builder.query({
      query: () => ({
        url: "/list-backups",
        method: "GET",
      }),
      providesTags: ["Backups"],
    }),

    // 4. Buat Backup Baru
    createBackup: builder.mutation({
      query: () => ({
        url: "/create-backup",
        method: "GET", // Sesuai router Anda
      }),
      invalidatesTags: ["Backups"], // Refresh list backup setelah membuat
    }),

    // 5. Hapus File Backup
    deleteBackup: builder.mutation({
      query: (filename) => ({
        url: `/delete-backup/${filename}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Backups"],
    }),

    // 6. Restore Database
    restoreData: builder.mutation({
      query: (formData) => ({
        url: "/restore-data",
        method: "POST",
        body: formData,
      }),
      // Restore mengubah seluruh data, jadi kita invalidate semua
      invalidatesTags: ["Database", "Backups"],
    }),
  }),
});

export const {
  useGetTablesQuery,
  useResetTablesMutation,
  useGetBackupsQuery,
  useCreateBackupMutation,
  useDeleteBackupMutation,
  useRestoreDataMutation,
} = ApiDatabase;
