const express = require('express');
const cors = require('cors'); // 
const pool = require('./db');
require('dotenv').config();

const app = express();

app.use(cors()); // ✅ Enabling CORS for all requests (for now, dev mode)
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to KKON Coverage API');
});

app.post('/check-coverage', async (req, res) => {
  const { latitude, longitude } = req.body;

  // ✅ Basic input validation
  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and Longitude are required!' });
  }

  try {
    const query = `
      SELECT *
      FROM coverage_areas
      WHERE ST_Contains(geom, ST_SetSRID(ST_Point($1, $2), 4326));
    `;

    const result = await pool.query(query, [longitude, latitude]);

    if (result.rows.length > 0) {
      res.json({ message: '✅ We have coverage in your area!', covered: true });
    } else {
      res.json({ message: '❌ Sorry! No coverage yet.', covered: false });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
