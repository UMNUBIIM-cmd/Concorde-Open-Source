'use strict';

const { Pool } = require('pg');

let pool = null;
let initializationPromise = null;
const saveQueues = new Map();

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return pool;
}

async function initialize() {
  const db = getPool();
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS concorde_guilds (
          code TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS concorde_roster (
          guild_code TEXT NOT NULL REFERENCES concorde_guilds(code) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (guild_code, user_id)
        )
      `);

      return db;
    })().catch((err) => {
      initializationPromise = null;
      throw err;
    });
  }

  return initializationPromise;
}

async function loadGuilds() {
  const db = await initialize();
  const result = await db.query(
    'SELECT code, data FROM concorde_guilds ORDER BY updated_at ASC'
  );
  for (const row of result.rows) {
    const members = await db.query(
      'SELECT data FROM concorde_roster WHERE guild_code = $1',
      [row.code]
    );
    row.roster = members.rows.map((member) => member.data);
  }

  return result.rows;
}

async function writeSnapshot(snapshot) {
  const db = await initialize();
  const client = await db.connect();
  const memberIds = snapshot.roster.map((member) => member.userId);

  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO concorde_guilds (code, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (code)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `, [snapshot.code, JSON.stringify(snapshot.data)]);

    // Remova membros antigos na mesma transação que salva o estado novo.
    await client.query(
      'DELETE FROM concorde_roster WHERE guild_code = $1 AND NOT (user_id = ANY($2::text[]))',
      [snapshot.code, memberIds]
    );

    for (const member of snapshot.roster) {
      await client.query(`
        INSERT INTO concorde_roster (guild_code, user_id, data, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (guild_code, user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `, [snapshot.code, member.userId, JSON.stringify(member)]);
    }

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Preserve o erro original.
    }
    throw err;
  } finally {
    client.release();
  }
}

function saveGuild(guild) {
  // Tire uma cópia do estado agora; saves posteriores ficam enfileirados para
  // que uma gravação mais antiga não sobrescreva uma mais recente.
  const snapshot = {
    code: guild.code,
    data: {
      id: guild.id,
      code: guild.code,
      name: guild.name,
      icon: guild.icon,
      channels: JSON.parse(JSON.stringify(guild.channels)),
      messages: JSON.parse(JSON.stringify(guild.messages)),
      player: guild.player == null ? null : JSON.parse(JSON.stringify(guild.player)),
    },
    roster: Array.from(guild.roster.values(), (member) => JSON.parse(JSON.stringify(member))),
  };

  const previous = saveQueues.get(snapshot.code) || Promise.resolve();
  const queued = previous.catch(() => {}).then(() => writeSnapshot(snapshot));
  saveQueues.set(snapshot.code, queued);

  return queued.finally(() => {
    if (saveQueues.get(snapshot.code) === queued) {
      saveQueues.delete(snapshot.code);
    }
  });
}

module.exports = { initialize, loadGuilds, saveGuild };
