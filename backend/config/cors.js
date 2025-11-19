const cors = require("cors");

module.exports = (app) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://spryclips.com:7522",
    "https://www.spryclips.com:7522",
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        console.log("🔍 Incoming Origin:", origin);

        // Allow requests with no origin (Postman, curl, server-side)
        if (!origin) {
          console.log("⚠️ No Origin header, allowing request");
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          console.log("✅ CORS Allowed:", origin);
          return callback(null, true);
        } else {
          console.log("❌ CORS Blocked:", origin);
          return callback(new Error("CORS not allowed for this origin"), false);
        }
      },
      credentials: true,
    })
  );
};
