const { execSync } = require("child_process");

execSync("npx prisma generate", { stdio: "inherit" });

if (process.env.RENDER) {
  console.log("Render: compilando TypeScript...");
  execSync("npm run build", { stdio: "inherit" });
}
