/**
 * SuperAdmin portal şifresi için bcrypt hash üretir.
 *
 * Kullanım:
 *   node scripts/hash-admin-password.mjs "Sifreniz"
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Kullanım: node scripts/hash-admin-password.mjs \"Sifreniz\"");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(hash);
