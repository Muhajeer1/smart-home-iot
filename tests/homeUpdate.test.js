const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(query) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/homeController.js'), 'utf8'), {
    exports, console,
    require(name) {
      if (name === '../db') return { query };
      if (name === '../services/eventService') return {};
      return require(name);
    },
  });
  return async (body, id = '6') => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await exports.updateHome({ body, params: { id }, user: { user_id: 2 } }, res);
    return res;
  };
}

test('invalid input never writes to the database', async () => {
  const run = setup(() => assert.fail('Unexpected database write'));
  for (const body of [undefined, {}, { home_name: ' ', address_text: 'A' },
    { home_name: 'N', address_text: [] }, { home_name: 3, address_text: 'A' },
    { home_name: 'x'.repeat(61), address_text: 'A' },
    { home_name: 'N', address_text: 'x'.repeat(201) }]) {
    assert.equal((await run(body)).code, 400);
  }
  for (const id of ['0', '-1', 'abc', '1.5', '2147483648']) {
    assert.equal((await run({ home_name: 'N', address_text: 'A' }, id)).code, 400);
  }
});

test('trimmed update is scoped to authenticated owner and ignores injected ownership', async () => {
  const run = setup(async (sql, params) => {
    assert.match(sql, /WHERE home_id = \$3 AND owner_user_id = \$4/);
    assert.deepEqual(Array.from(params), ['N', 'A', '6', 2]);
    return { rows: [{ home_id: 6, owner_user_id: 2, home_name: 'N', address_text: 'A' }] };
  });
  const res = await run({ home_name: ' N ', address_text: ' A ', owner_user_id: 3 });
  assert.equal(res.code, 200);
  assert.equal(res.data.home.owner_user_id, 2);
});

test('missing or inaccessible home gives a generic 404', async () => {
  const res = await setup(async () => ({ rows: [] }))({ home_name: 'N', address_text: 'A' });
  assert.equal(res.code, 404);
  assert.equal(res.data.error, 'Home not found.');
});

test('maximum supported lengths reach persistence intact', async () => {
  const run = setup(async (sql, params) => {
    assert.equal(Array.from(params[0]).length, 60);
    assert.equal(Array.from(params[1]).length, 200);
    return { rows: [{ home_id: 6 }] };
  });
  assert.equal((await run({ home_name: 'я'.repeat(60), address_text: 'z'.repeat(200) })).code, 200);
});
