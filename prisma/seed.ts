import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("demo1234", 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@aipoweredcall.com" },
    update: {},
    create: {
      email: "demo@aipoweredcall.com",
      name: "デモユーザー",
      hashedPassword,
      plan: "FREE",
      settings: {
        create: {
          defaultLanguage: "ja",
          autoSummarize: true,
          retentionDays: 90,
        },
      },
    },
  });

  console.log("Demo user created:", demoUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
