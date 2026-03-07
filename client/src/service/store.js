import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./auth/SliceAuth";
import appReducer from "./center/SliceApp";

const apiModules = import.meta.glob("./**/Api*.js", { eager: true });

const isApiService = (candidate) =>
  Boolean(
    candidate &&
      typeof candidate === "object" &&
      typeof candidate.reducerPath === "string" &&
      typeof candidate.reducer === "function" &&
      typeof candidate.middleware === "function",
  );

const apiServiceMap = new Map();

for (const moduleExports of Object.values(apiModules)) {
  for (const moduleValue of Object.values(moduleExports)) {
    if (!isApiService(moduleValue)) {
      continue;
    }

    if (!apiServiceMap.has(moduleValue.reducerPath)) {
      apiServiceMap.set(moduleValue.reducerPath, moduleValue);
    }
  }
}

const apiServices = Array.from(apiServiceMap.values()).sort((a, b) =>
  a.reducerPath.localeCompare(b.reducerPath),
);

const apiReducers = apiServices.reduce((accumulator, service) => {
  accumulator[service.reducerPath] = service.reducer;
  return accumulator;
}, {});

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    ...apiReducers,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(apiServices.map((service) => service.middleware)),
  devTools: import.meta.env.DEV,
});
