import { createSlice } from "@reduxjs/toolkit";
import { ApiApp } from "./ApiApp";

const initialState = {
  publicConfig: {
    app_name: "EduCore",
    meta_title: "EduCore System",
    meta_description: "Sistem Manajemen Sekolah",
    app_logo: null,
    app_favicon: null,
    // Tambahkan default lain jika perlu untuk mencegah null di awal
    og_image: null,
    og_title: "EduCore",
  },
  status: "idle", // idle | loading | succeeded | failed
  initialized: false,
};

const sliceApp = createSlice({
  name: "sliceApp", // Nama slice di store
  initialState,
  reducers: {
    // Action manual jika diperlukan
    setAppConfig: (state, action) => {
      state.publicConfig = { ...state.publicConfig, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    // 1. Listen saat getPublicConfig LOADING
    builder.addMatcher(
      ApiApp.endpoints.getPublicConfig.matchPending,
      (state) => {
        state.status = "loading";
      },
    );

    // 2. Listen saat getPublicConfig SUKSES (Fulfilled)
    builder.addMatcher(
      ApiApp.endpoints.getPublicConfig.matchFulfilled,
      (state, { payload }) => {
        state.status = "succeeded";
        state.initialized = true;

        // PERBAIKAN DISINI:
        // Karena endpoint /public-config mengembalikan res.json(object),
        // maka 'payload' ADALAH data itu sendiri. Tidak perlu .data
        if (payload) {
          state.publicConfig = { ...state.publicConfig, ...payload };
        }
      },
    );

    // 3. Listen saat getPublicConfig GAGAL
    builder.addMatcher(
      ApiApp.endpoints.getPublicConfig.matchRejected,
      (state) => {
        state.status = "failed";
      },
    );
  },
});

export const { setAppConfig } = sliceApp.actions;

// Selector untuk mempermudah pengambilan data di komponen
export const selectPublicConfig = (state) => state.sliceApp.publicConfig;
export const selectAppStatus = (state) => state.sliceApp.status;

export default sliceApp.reducer;
