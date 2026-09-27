const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the deployed entrypoint with real Express/auth and an isolated DB stub.
// Never load db.js or connect to local/cloud PostgreSQL in deployment tests.
process.env.JWT_SECRET = 'deployment-test-key-not-used-outside-this-process';
process.env.NODE_ENV = 'production';
const user = { user_id: 2, full_name: 'Deployment test', email: 'deployment@example.test', role_id: 2, role_name: 'user' };
const queries = [];
const databasePath = require.resolve('../db');
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query: async (sql, params = []) => {
    queries.push({sql,params});
    if (sql.includes('FROM "User"')) return {rows:[{...user,password_hash:require('bcrypt').hashSync('local-fixture-password',4)}]};
    if (/FROM Home/i.test(sql)) return {rows:[{home_id:6,owner_user_id:2,home_name:'Test home',address_text:'Test address'}]};
    return {rows:[]};
  },
}};
let server, base;
before(async () => {
  server = http.createServer(require('../api'));
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {server.closeAllConnections();await new Promise(resolve => server.close(resolve));});

test('deployment adapter strips only the backend namespace and preserves request content', () => {
  let captured;
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/index.js'),'utf8'),{
    module, require: () => (req,res) => {captured={url:req.url,method:req.method,body:req.body,headers:req.headers};res.end();},
  });
  for (const [input,expected] of [['/backend/api/homes','/api/homes'],['/backend/analytics/devices-per-home?homeId=6','/analytics/devices-per-home?homeId=6'],['/backend/alerts?status=all','/alerts?status=all'],['/backend','/'],['/backend?x=1','/?x=1'],['/backend-other/me','/backend-other/me']]) {
    const req={url:input,method:'PATCH',body:{is_resolved:true},headers:{cookie:'test-cookie'}};
    module.exports(req,{setHeader(){},end(){}});
    assert.equal(captured.url,expected);
    assert.equal(captured.method,'PATCH');
    assert.equal(captured.body,req.body);
    assert.equal(captured.headers,req.headers);
  }
});

test('anonymous prefixed session request returns JSON 401, not the React page',async () => {
  const response=await fetch(base+'/backend/me');
  assert.equal(response.status,401);
  assert.match(response.headers.get('content-type'),/application\/json/);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal((await response.json()).error,'Please log in again.');
});

test('production cookie login, session restore, API reads and logout work through the prefix',async () => {
  const response=await fetch(base+'/backend/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'local-fixture-password'})});
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie');
  for(const attribute of ['HttpOnly','Secure','SameSite=Lax','Path=/']) assert.ok(cookie.includes(attribute),`Missing ${attribute}`);
  const headers={cookie:cookie.split(';')[0]};
  const session=await fetch(base+'/backend/me',{headers});
  assert.equal((await session.json()).user.user_id,2);
  const homes=await fetch(base+'/backend/api/homes',{headers});
  assert.equal(homes.status,200);
  assert.equal((await homes.json())[0].home_name,'Test home');
  const analytics=await fetch(base+'/backend/analytics/devices-per-home?homeId=6',{headers});
  assert.equal(analytics.status,200);
  assert.ok(queries.some(query => query.params[0] === '6' && query.params[1] === 2),'Home filter and owner scope reach SQL');
  const restricted=await fetch(base+'/backend/admin/users',{headers});
  assert.equal(restricted.status,403);
  const logout=await fetch(base+'/backend/logout',{method:'POST',headers});
  assert.equal(logout.status,200);
  assert.match(logout.headers.get('set-cookie'),/token=;/);
  assert.match(logout.headers.get('set-cookie'),/Expires=Thu, 01 Jan 1970/);
});

test('Vercel configuration keeps the root backend and serves built SPA pages', () => {
  const config=require('../vercel.json');
  assert.equal(config.outputDirectory,'client/dist');
  assert.equal(config.framework,null);
  assert.equal(config.rewrites[0].source,'/backend/:path*');
  assert.equal(config.rewrites[0].destination,'/api');
  const spaPattern = new RegExp(`^${config.rewrites[1].source}$`);
  for(const url of ['/','/login','/homes/6/rooms/4/devices/12','/analytics','/admin']) assert.ok(spaPattern.test(url));
  for(const url of ['/api','/api/index','/assets/missing.js']) assert.ok(!spaPattern.test(url));
  const html=fs.readFileSync(path.join(__dirname,'../client/dist/index.html'),'utf8');
  assert.match(html,/id="root"/);
  assert.match(html,/\/assets\/.*\.js/);
});


test('direct local Express serves React and prefixed API independently', async t => {
  const local = http.createServer(require('../server'));
  await new Promise(resolve => local.listen(0,'127.0.0.1',resolve));
  t.after(async () => {local.closeAllConnections();await new Promise(resolve => local.close(resolve));});
  const localBase = `http://127.0.0.1:${local.address().port}`;
  const page = await fetch(localBase+'/homes/6/rooms/4');
  assert.equal(page.status,200);assert.match(await page.text(),/id="root"/);
  for(const endpoint of ['/me','/backend/me']) {
    const response=await fetch(localBase+endpoint);assert.equal(response.status,401);
    assert.match(response.headers.get('content-type'),/application\/json/);
  }
  const login=await fetch(localBase+'/backend/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'local-fixture-password'})});
  assert.equal(login.status,200);
  const headers={cookie:login.headers.get('set-cookie').split(';')[0]};
  const homes=await fetch(localBase+'/backend/api/homes',{headers});
  assert.equal(homes.status,200);assert.equal((await homes.json())[0].home_name,'Test home');
  const unknown=await fetch(localBase+'/backend/not-a-real-endpoint');
  assert.equal(unknown.status,404);assert.match(unknown.headers.get('content-type'),/application\/json/);
});
