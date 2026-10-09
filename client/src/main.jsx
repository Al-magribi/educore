import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntdApp } from "antd";
import { Provider } from "react-redux";

import App from "./App.jsx";
import { store } from "./service/store.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <AntdApp>
        <App />
      </AntdApp>
    </Provider>
  </StrictMode>,
);
