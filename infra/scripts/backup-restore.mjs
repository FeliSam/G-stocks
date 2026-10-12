import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PG_BIN_DIR = process.env.PG_BIN_DIR || "C:\\Program Files\\PostgreSQL\\18\\bin";
const PG_PORT = process.env.PG_LOCAL_PORT || "5433";
const DB_NAME = process.env.PG_DB || "gstock";
const BACKUP_DIR = path.join(process.cwd(), ".pgdata", "backups");
const PASSPHRASE = process.env.BACKUP_ENCRYPTION_KEY || "gstock-dev-backup-verification-key-32b";

function binPath(exe) {
  const full = path.join(PG_BIN_DIR, process.platform === "win32" ? `${exe}.exe` : exe);
  return fs.existsSync(full) ? full : exe;
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32);
}

export function createEncryptedBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const encryptedFile = path.join(BACKUP_DIR, `gstock-${timestamp}.sql.enc`);

  const sqlDump = execFileSync(
    binPath("pg_dump"),
    ["-h", "127.0.0.1", "-p", PG_PORT, "-U", "postgres", "--clean", "--if-exists", DB_NAME],
    { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 }
  );

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(PASSPHRASE, salt);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(sqlDump), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([salt, iv, authTag, encrypted]);
  fs.writeFileSync(encryptedFile, payload);
  return { encryptedFile, bytes: payload.length };
}

export function decryptAndVerifyRestore(encryptedFile) {
  const payload = fs.readFileSync(encryptedFile);
  const salt = payload.subarray(0, 16);
  const iv = payload.subarray(16, 28);
  const authTag = payload.subarray(28, 44);
  const ciphertext = payload.subarray(44);

  const key = deriveKey(PASSPHRASE, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decryptedSql = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");

  const tempDb = `${DB_NAME}_restore_test`;
  try {
    execFileSync(binPath("dropdb"), ["-h", "127.0.0.1", "-p", PG_PORT, "-U", "postgres", "--if-exists", tempDb]);
    execFileSync(binPath("createdb"), ["-h", "127.0.0.1", "-p", PG_PORT, "-U", "postgres", tempDb]);
    execFileSync(binPath("psql"), ["-h", "127.0.0.1", "-p", PG_PORT, "-U", "postgres", "-d", tempDb], {
      input: decryptedSql,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const tableCount = execFileSync(
      binPath("psql"),
      [
        "-h",
        "127.0.0.1",
        "-p",
        PG_PORT,
        "-U",
        "postgres",
        "-d",
        tempDb,
        "-tc",
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';",
      ],
      { encoding: "utf8" }
    ).trim();
    return { restoredDb: tempDb, publicTableCount: Number(tableCount) };
  } finally {
    execFileSync(binPath("dropdb"), ["-h", "127.0.0.1", "-p", PG_PORT, "-U", "postgres", "--if-exists", tempDb]);
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const { encryptedFile, bytes } = createEncryptedBackup();
  console.log(`[Backup] Sauvegarde chiffrée AES-256-GCM créée : ${encryptedFile} (${bytes} octets)`);
  const verify = decryptAndVerifyRestore(encryptedFile);
  console.log(`[Restore] Restauration testée avec succès sur '${verify.restoredDb}' (${verify.publicTableCount} tables vérifiées).`);
}
