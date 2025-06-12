const express = require("express");
const axios = require("axios");
const turf = require("@turf/turf");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const coverageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'coverage.geojson'), 'utf8'));

router.post("/check-coverage", async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const geoResponse = await axios.get(nominatimUrl, {
      headers: { "User-Agent": "CoverageChecker/1.0" },
        timeout: 5000, // 5 seconds
    });

    if (!geoResponse.data.length) {
      return res.status(404).json({ coverage: false, error: "Address not found" });
    }

    const { lat, lon } = geoResponse.data[0];
    const userPoint = turf.point([parseFloat(lon), parseFloat(lat)]);

    let coverageFound = false;

    for (const feature of coverageData.features) {
      if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
        if (turf.booleanPointInPolygon(userPoint, feature)) {
          coverageFound = true;
          break;
        }
      } else if (feature.geometry.type === "Point") {
        const point = turf.point(feature.geometry.coordinates);
        const distance = turf.distance(userPoint, point, { units: "kilometers" });
        const threshold = 0.5; // 500 meters
        if (distance <= threshold) {
          coverageFound = true;
          break;
        }
      }
    }

    return res.json({ coverage: coverageFound, lat, lng: lon });
  } catch (err) {
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({ error: "Geocoding service timed out" });
  }
  console.error("Error checking coverage:", err.message);
  return res.status(500).json({ error: "Internal server error" });
}

});

module.exports = router;
