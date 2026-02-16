import { createInternalUser, getUserByEmail, updateUserPasswordByEmail, updateUserRoleByEmail } from "../db";

function usage() {
  console.log("Usage: pnpm tsx server/scripts/create-superadmin.ts <email> <password>");
}

async function main() {
  const [, , emailRaw, password] = process.argv;
  const email = (emailRaw || "").trim().toLowerCase();

  if (!email || !password) {
    usage();
    process.exit(1);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    await updateUserRoleByEmail(email, "superadmin" as any);
    await updateUserPasswordByEmail(email, password);
    console.log(`[OK] Updated existing user to superadmin: ${email}`);
    return;
  }

  await createInternalUser({
    name: "Super Admin",
    email,
    password,
    role: "superadmin" as any,
  });

  console.log(`[OK] Created superadmin user: ${email}`);
}

main().catch((err) => {
  console.error("[ERR]", err);
  process.exit(1);
});

