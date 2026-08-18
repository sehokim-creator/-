/*
 * Entry point for the single-file HTML build (scripts/build-standalone.mjs).
 *
 * The deployed app is server-rendered by vinext. This bundle exists only so the
 * POC can be handed over as one .html file that opens from the filesystem with
 * no server, no install, and no network — useful for review on a phone or a
 * locked-down laptop. It mounts the same app/page.tsx client-side.
 *
 * The API routes are not part of this bundle, so the Sheets endpoint is absent
 * and every screen shows POC data. That is the intended behaviour here.
 */

import { createRoot } from "react-dom/client";
import Home from "../../app/page";
// app/layout.tsx does this in the real app; there is no layout in this bundle.
import "../../app/globals.css";

const mount = document.getElementById("root");
if (!mount) throw new Error("standalone build: #root missing from the host page");
createRoot(mount).render(<Home />);
