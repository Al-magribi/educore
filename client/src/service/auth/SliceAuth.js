import { createSlice } from "@reduxjs/toolkit";
import { ApiAuth } from "./ApiAuth";

const UserSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    // isInitialized false artinya aplikasi belum tahu status user (lagi loading awal)
    isInitialized: false,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    // --- LOGIN ---
    builder.addMatcher(
      ApiAuth.endpoints.DoSignin.matchFulfilled,
      (state, action) => {
        state.user = action.payload.user; // Pastikan struktur payload sesuai response backend
        state.isInitialized = true;
      },
    );

    // --- LOAD USER (INIT) ---
    builder.addMatcher(ApiAuth.endpoints.loadUser.matchPending, (state) => {
      // Jangan set isInitialized false disini jika ingin background re-fetching,
      // tapi untuk initial load, ini oke.
    });

    builder.addMatcher(
      ApiAuth.endpoints.loadUser.matchFulfilled,
      (state, action) => {
        state.user = action.payload;
        state.isInitialized = true; // Selesai cek, User Login
      },
    );

    builder.addMatcher(ApiAuth.endpoints.loadUser.matchRejected, (state) => {
      state.user = null;
      state.isInitialized = true; // Selesai cek, User Tamu (Guest)
    });

    // --- LOGOUT ---
    builder.addMatcher(ApiAuth.endpoints.DoLogout.matchFulfilled, (state) => {
      state.user = null;
      state.isInitialized = true;
    });
  },
});

export const { setUser, clearUser } = UserSlice.actions;
export default UserSlice.reducer;
