const express = require("express");
const axios = require("axios");
const turf = require("@turf/turf");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const coverageData = JSON.parse(fs.readFileSync(path.join(__dirname, "coverage.geojson"), "utf8"));

router.post("/check-coverage", async (req, res) => {
  const { address, lat, lng } = req.body;

  if (lat !== undefined && lng !== undefined) {
    // --- User selected a location: perform coverage check ---
    const userPoint = turf.point([parseFloat(lng), parseFloat(lat)]);
    let coverageFound = false;

    for (const feature of coverageData.features) {
      if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
        if (turf.booleanPointInPolygon(userPoint, feature)) { coverageFound = true; break; }
      } else if (feature.geometry.type === "Point") {
        const distanceKm = turf.distance(userPoint, turf.point(feature.geometry.coordinates), { units: "kilometers" });
        if (distanceKm <= 0.5) { coverageFound = true; break; }
      }
    }
    return res.json({ coverage: coverageFound });
  }

  if (!address) {
    return res.status(400).json({ error: "Address or coordinates required." });
  }

  // --- No coordinates yet: Geocode and return candidates ---
  try {
    const geo = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { format: "json", q: address },
      headers: { "User-Agent": "coverage-checker-app" },
      timeout: 5000
    });

    if (!geo.data.length) {
      return res.json({ candidates: [] });
    }

    const candidates = geo.data.slice(0, 5).map((c) => ({
      display_name: c.display_name,
      lat: c.lat,
      lon: c.lon
    }));

    return res.json({ candidates });
  } catch (err) {
    console.error("Geocoding error:", err.message);
    if (err.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Geocoding service timed out" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
