import { getVersion, setWorkerUrl } from "maplibre-gl";

setWorkerUrl(
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${getVersion()}/dist/maplibre-gl-worker.mjs`,
);
