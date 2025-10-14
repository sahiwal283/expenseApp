const bcrypt = require("bcrypt");
const { pool } = require("./dist/config/database.js");

async function updatePasswords() {
  try {
    const hash = await bcrypt.hash("sandbox123", 10);
    console.log("Generated hash for password: sandbox123");
    
    const result = await pool.query(
      "UPDATE users SET password = $1 RETURNING username, email, role",
      [hash]
    );
    
    console.log("\n✓ Updated", result.rowCount, "users:");
    result.rows.forEach(u => {
      console.log("  •", u.username.padEnd(12), "("+u.role.padEnd(11)+")", u.email);
    });
    
    console.log("\n🔑 All users can now login with password: sandbox123");
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

updatePasswords();

