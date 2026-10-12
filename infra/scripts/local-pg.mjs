import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";

const ROOT_DIR = process.cwd();
const PG_BIN_DIR = process.env.PG_BIN_DIR || "C:\\Program Files\\PostgreSQL\\18\\bin";
const PG_DATA_DIR = path.join(ROOT_DIR, ".pgdata", "cluster");
const PG_LOG_FILE = path.join(ROOT_DIR, ".pgdata", "postgres.log");
const PG_PORT = process.env.PG_LOCAL_PORT || "5433";
const DB_NAME = "gstock";

function binPath(exe) {
  const full = path.join(PG_BIN_DIR, process.platform === "win32" ? `${exe}.exe` : exe);
  return fs.existsSync(full) ? full : exe;
}

function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(Number(port), "127.0.0.1");
  });
}

async function startCluster() {
  fs.mkdirSync(path.dirname(PG_DATA_DIR), { recursive: true });

  if (!fs.existsSync(path.join(PG_DATA_DIR, "PG_VERSION"))) {
    console.log(`[G-Stock PG] Initialisation du cluster PostgreSQL local dans ${PG_DATA_DIR}...`);
    execFileSync(
      binPath("initdb"),
      ["-D", PG_DATA_DIR, "-U", "postgres", "-A", "trust", "--encoding=UTF8", "--locale=C"],
      { stdio: "inherit" }
    );
  }

  const running = await isPortListening(PG_PORT);
  if (!running) {
    console.log(`[G-Stock PG] Démarrage de PostgreSQL sur 127.0.0.1:${PG_PORT}...`);
    execFileSync(
      binPath("pg_ctl"),
      ["-D", PG_DATA_DIR, "-l", PG_LOG_FILE, "-o", `-p ${PG_PORT} -h 127.0.0.1`, "start"],
      { stdio: "inherit" }
    );
  } else {
    console.log(`[G-Stock PG] PostgreSQL écoute déjà sur 127.0.0.1:${PG_PORT}.`);
  }

  try {
    execFileSync(
      binPath("psql"),
      [
        "-h",
        "127.0.0.1",
        "-p",
        PG_PORT,
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-tc",
        `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`,
      ],
      { encoding: "utf8" }
    );
    const check = execFileSync(
      binPath("psql"),
      [
        "-h",
        "127.0.0.1",
        "-p",
        PG_PORT,
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-tc",
        `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`,
      ],
      { encoding: "utf8" }
    );
    if (!check.includes("1")) {
      console.log(`[G-Stock PG] Création de la base '${DB_NAME}'...`);
      execFileSync(
        binPath("createdb"),
        ["-h", "127.0.0.1", "-p", PG_PORT, "-U", "postgres", DB_NAME],
        { stdio: "inherit" }
      );
    }
  } catch (err) {
    console.error("[G-Stock PG] Erreur lors de la vérification/création de la base :", err.message);
    process.exit(1);
  }

  console.log(`[G-Stock PG] Prêt : postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/${DB_NAME}?schema=public`);
}

async function stopCluster() {
  if (fs.existsSync(path.join(PG_DATA_DIR, "PG_VERSION"))) {
    try {
      execFileSync(binPath("pg_ctl"), ["-D", PG_DATA_DIR, "stop", "-m", "fast"], {
        stdio: "inherit",
      });
    } catch {
      console.log("[G-Stock PG] Le cluster est déjà arrêté.");
    }
  }
}

const action = process.argv[2] || "start";
if (action === "stop") {
  await stopCluster();
} else {
  await startCluster();
}
