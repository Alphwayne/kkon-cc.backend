const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const checkCoverage = require("../checkCoverage");  // <-- corrected here

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use("/api", checkCoverage);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
