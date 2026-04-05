import "dotenv/config";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = new Pool({ connectionString: url });
pool.query('SELECT COUNT(*) FROM "StagingImage"')
  .then(({ rows }) => console.log("StagingImage count:", rows[0].count))
  .finally(() => pool.end());
