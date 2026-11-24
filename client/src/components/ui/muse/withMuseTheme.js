import { createElement } from "react";

import { MuseThemeProvider } from "./index.jsx";

/** Bungkus komponen halaman dengan MuseThemeProvider (dipakai di file routes). */
const withMuseTheme = (Component) => {
  const Themed = (props) =>
    createElement(MuseThemeProvider, null, createElement(Component, props));
  return Themed;
};

export default withMuseTheme;
