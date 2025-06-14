const express = require("express");
const axios = require("axios");
const turf = require("@turf/turf");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Load GeoJSON coverage data once
const coveragePath = path.join(__dirname, "../public/coverage.geojson");
const coverageData = JSON.parse(fs.readFileSync(coveragePath, "utf8"));

// Utility: Normalize strings for loose matching
const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/\bst\b/g, "street")
    .replace(/\brd\b/g, "road")
    .replace(/\bave\b/g, "avenue")
    .replace(/\bdr\b/g, "drive")
    .replace(/\bct\b/g, "court")
    .replace(/\bln\b/g, "lane")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

router.post("/match-streets", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address is required." });

  const queryNorm = normalize(address);
  const results = coverageData.features
    .map((feature, i) => ({
      id: i,
      name: feature.properties.name,
      coordinates: feature.geometry.coordinates,
      normName: normalize(feature.properties.name),
    }))
    .filter((f) => f.normName.includes(queryNorm));

  res.json({ results: results.map(({ id, name, coordinates }) => ({ id, name, coordinates })) });
});

router.post("/check-coordinates", (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Latitude and longitude required" });
  }

  const point = turf.point([lng, lat]);

  const match = coverageData.features.find((feature) =>
    turf.booleanPointInPolygon(point, feature)
  );

  if (match) {
    return res.json({ coverage: true });
  } else {
    return res.json({ coverage: false });
  }
});

module.exports = router;
