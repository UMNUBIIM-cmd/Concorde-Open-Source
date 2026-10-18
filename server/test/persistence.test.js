'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

const memoryDb = {
  guilds: new Map(),
  roster: new Map(),
  createTableCalls: 0,
};

function normalize(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

class FakePool {
  async query(sql, params = []) {
    const statement = normalize(sql);
    if (statement.startsWith('create table if not exists')) {
      memoryDb.createTableCalls += 1;
      return { rows: [] };
    }
    if (statement.startsWith('select code, data from concorde_guilds')) {
      return { rows: Array.from(memoryDb.guilds, ([code, data]) => ({ code, data })) };
    }
    if (statement.startsWith('select data from concorde_roster where guild_code')) {
      const [code] = params;
      return {
        rows: Array.from(memoryDb.roster.values())
          .filter((member) => member.guild_code === code)
          .map((member) => ({ data: member.data })),
      };
    }
    throw new Error('SQL não previsto no teste: ' + statement);
  }

  async connect() {
    return {
      query: async (sql, params = []) => {
        const statement = normalize(sql);
        if (['begin', 'commit', 'rollback'].includes(statement)) return { rows: [] };

        if (statement.startsWith('insert into concorde_guilds')) {
          memoryDb.guilds.set(params[0], JSON.parse(params[1]));
          return { rows: [] };
        }

        if (statement.startsWith('delete from concorde_roster')) {
          const [code, keepIds] = params;
          const keep = new Set(keepIds);
          for (const [key, member] of memoryDb.roster) {
            if (member.guild_code === code && !keep.has(member.user_id)) {
              memoryDb.roster.delete(key);
            }
          }
          return { rows: [] };
        }

        if (statement.startsWith('insert into concorde_roster')) {
          const [guildCode, userId, json] = params;
          memoryDb.roster.set(guildCode + '\0' + userId, {
            guild_code: guildCode,
            user_id: userId,
            data: JSON.parse(json),
          });
          return { rows: [] };
        }

        throw new Error('SQL transacional não previsto no teste: ' + statement);
      },
      release() {},
    };
  }
}

// Injeta um Pool em memória antes de importar o módulo de persistência.
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'pg') return { Pool: FakePool };
  return originalLoad.call(this, request, parent, isMain);
};
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
const persistence = require('../persistence');
Module._load = originalLoad;

function makeGuild() {
  return {
    id: 'guild-id',
    code: 'CORDE-ABCDE',
    name: 'Servidor teste',
    icon: null,
    channels: [{ id: 'channel-1', name: 'geral', type: 'text' }],
    messages: { 'channel-1': [{ id: 'message-1', text: 'olá' }] },
    player: null,
    roster: new Map([
      ['user_000001', { userId: 'user_000001', nick: 'Ana', avatar: null }],
      ['user_000002', { userId: 'user_000002', nick: 'Beto', avatar: null }],
    ]),
  };
}

function resetData() {
  memoryDb.guilds.clear();
  memoryDb.roster.clear();
}

test('salva e restaura servidor, canais, mensagens e membros', async () => {
  resetData();
  const guild = makeGuild();
  await persistence.saveGuild(guild);

  const rows = await persistence.loadGuilds();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].data.name, 'Servidor teste');
  assert.equal(rows[0].data.channels[0].name, 'geral');
  assert.equal(rows[0].data.messages['channel-1'][0].text, 'olá');
  assert.equal(rows[0].roster.length, 2);
});

test('remove do banco membros que já não existem no roster atual', async () => {
  resetData();
  const guild = makeGuild();
  await persistence.saveGuild(guild);
  guild.roster.delete('user_000002');
  await persistence.saveGuild(guild);

  const rows = await persistence.loadGuilds();
  assert.deepEqual(rows[0].roster.map((member) => member.userId), ['user_000001']);
});

test('captura um snapshot imutável no momento em que saveGuild é chamado', async () => {
  resetData();
  const guild = makeGuild();
  const pending = persistence.saveGuild(guild);
  guild.channels.push({ id: 'channel-2', name: 'novo', type: 'text' });
  guild.messages['channel-1'].push({ id: 'message-2', text: 'posterior' });
  await pending;

  const rows = await persistence.loadGuilds();
  assert.equal(rows[0].data.channels.length, 1);
  assert.equal(rows[0].data.messages['channel-1'].length, 1);
});

test('serializa saves do mesmo servidor e mantém a versão mais recente', async () => {
  resetData();
  const guild = makeGuild();
  const first = persistence.saveGuild(guild);
  guild.name = 'Versão mais recente';
  const second = persistence.saveGuild(guild);
  await Promise.all([first, second]);

  const rows = await persistence.loadGuilds();
  assert.equal(rows[0].data.name, 'Versão mais recente');
});

test('inicializa as tabelas uma única vez', async () => {
  resetData();
  const before = memoryDb.createTableCalls;
  await persistence.loadGuilds();
  await persistence.saveGuild(makeGuild());
  await persistence.loadGuilds();
  assert.equal(memoryDb.createTableCalls - before, 0);
});
