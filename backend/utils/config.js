const PORT = Number(process.env.PORT) || 5000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

module.exports = {
  PORT,
  PUBLIC_URL
};
