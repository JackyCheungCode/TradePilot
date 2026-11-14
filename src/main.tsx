import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./styles/globals.css";
import "./styles/carbon.scss";
import "@aora-bot/react/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Missing application root element "#root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
