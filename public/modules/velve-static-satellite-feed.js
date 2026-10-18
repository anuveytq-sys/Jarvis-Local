/* Local offline-safe orbit catalog.
   These 240 orbit markers are SIMULATED orbital objects for the VELVE visualizer.
   They are not live telemetry or a real NORAD catalog. */
(() => {
  "use strict";
  const epoch = "2026-10-18T00:00:00.000Z";
  window.__VELVE_STATIC_SATELLITES = Array.from({ length: 240 }, (_, index) => {
    const n = index + 1;
    return {
      NORAD_CAT_ID: 990000 + n,
      OBJECT_NAME: "JARVIS SIM SAT " + String(n).padStart(3, "0"),
      OBJECT_TYPE: "SIMULATED",
      EPOCH: epoch,
      INCLINATION: (n * 37.71) % 98,
      RA_OF_ASC_NODE: (n * 137.508) % 360,
      ECCENTRICITY: 0.001 + ((n * 17) % 50) / 1000,
      ARG_OF_PERICENTER: (n * 91.73) % 360,
      MEAN_ANOMALY: (n * 53.31) % 360,
      MEAN_MOTION: 12 + ((n * 19) % 40) / 10
    };
  });
})();
