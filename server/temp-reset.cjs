const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const DATABASE_URL = "postgresql://postgres:SvMpxYcIZydFfnbwhiyCWUdqZvRrOPmg@metro.proxy.rlwy.net:13908/railway";

const p = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

async function main() {
  try {
    const newPassword = "Admin@123";
    const hash = await bcrypt.hash(newPassword, 12);
    
    const user = await p.user.update({
      where: { email: "admin@zurilofts.co.ke" },
      data: { passwordHash: hash },
    });
    
    console.log("Password reset for:", user.email);
    console.log("New password:", newPassword);
  } finally {
    await p.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
