import fs from "fs";
import path from "path";

export const APP_USER_MODEL_ID = "com.magi-melee.app";

export function resolveAppIconPath(): string {
  const extension = process.platform === "win32" ? "ico" : "png";
  const rootLogo = extension === "ico" ? "magilogo2.ico" : "magilogo2-preview.png";
  const candidates = [
    path.resolve(process.resourcesPath ?? "", `icon.${extension}`),
    path.resolve(__dirname, `../../build/icon.${extension}`),
    path.resolve(process.cwd(), `build/icon.${extension}`),
    path.resolve(process.cwd(), rootLogo),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[candidates.length - 1]!;
}
