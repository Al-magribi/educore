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

    // 3. Ambil List Folder Backup
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

    // 5. Hapus Folder Backup
    deleteBackup: builder.mutation({
      query: (filename) => ({
        url: `/delete-backup/${filename}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Backups"],
    }),

    // 6. Download Folder Backup (ZIP)
    downloadBackup: builder.mutation({
      async queryFn(filename) {
        try {
          const response = await fetch(
            `/api/center/download-backup/${encodeURIComponent(filename)}`,
            {
              method: "GET",
              credentials: "include",
            },
          );

          if (!response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const data = await response.json();
              return {
                error: {
                  status: response.status,
                  data,
                },
              };
            }

            return {
              error: {
                status: response.status,
                data: { message: "Gagal mengunduh backup" },
              },
            };
          }

          const blob = await response.blob();
          const disposition = response.headers.get("content-disposition") || "";
          const match = disposition.match(/filename="?([^"]+)"?/i);

          return {
            data: {
              blob,
              filename: match?.[1] || `${filename}.zip`,
            },
          };
        } catch (error) {
          return {
            error: {
              status: "FETCH_ERROR",
              error: error?.message || "Gagal mengunduh backup",
            },
          };
        }
      },
    }),

    // 7. Restore Database
    restoreData: builder.mutation({
      query: (backupName) => ({
        url: "/restore-data",
        method: "POST",
        body: { backupName },
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
  useDownloadBackupMutation,
  useRestoreDataMutation,
} = ApiDatabase;
