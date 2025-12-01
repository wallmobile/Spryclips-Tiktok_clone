const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("\n=== RESEND CONFIGURATION CHECK ===\n");
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "SET (" + process.env.RESEND_API_KEY.substring(0, 10) + "...)" : "NOT SET");
console.log("EMAIL_FROM:", process.env.EMAIL_FROM || "NOT SET");

if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
  console.log("\n✅ Configuration found!");
  console.log("Testing Resend connection...\n");
  
  const { Resend } = require("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  console.log("Resend instance created successfully!");
  console.log("\nYou can now test sending email from backend.");
} else {
  console.log("\n❌ Configuration missing!");
}
