import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme/global.css";
import { App } from "./app/App";
import { initDemoClock } from "./app/demo-clock";

// Pin the query engine to 2025-06-01 so dynamic-date filters (startOfYear, today)
// resolve inside the bundled 2025 sample data.  Must run before the first render.
initDemoClock();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
