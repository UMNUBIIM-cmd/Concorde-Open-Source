'use strict';

const { Pool } = require('pg');

let pool = null;

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

async function saveGuild(guild) {
  const db = await initialize();

  const data = {
    id: guild.id,
    code: guild.code,
    name: guild.name,
    icon: guild.icon,
    channels: guild.channels,
    messages: guild.messages,
    player: guild.player,
  };

  await db.query(`
    INSERT INTO concorde_guilds (code, data, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (code)
    DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `, [guild.code, JSON.stringify(data)]);

  for (const member of guild.roster.values()) {
    await db.query(`
      INSERT INTO concorde_roster (guild_code, user_id, data, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (guild_code, user_id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `, [guild.code, member.userId, JSON.stringify(member)]);
  }
}

module.exports = { initialize, loadGuilds, saveGuild };
