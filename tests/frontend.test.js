const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { attachFrontend } = require('../utils/frontend');

async function serve(t, options) {
  const app = express();
  attachFrontend(app, options);
  const server = await new Promise(resolve => {const instance = app.listen(0,'127.0.0.1',()=>resolve(instance));});
  t.after(async () => {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  return `http://127.0.0.1:${server.address().port}`;
}

test('built frontend serves React and nested pages without Vite',async t => {
  const base=await serve(t,{});
  for(const url of ['/','/login','/homes/6/rooms/4/devices/12','/analytics']) {
    const response=await fetch(base+url);
    assert.equal(response.status,200);
    const html=await response.text();
    assert.match(html,/id="root"/);
    assert.doesNotMatch(html,/src="\/js\//);
    if(url === '/') {
      const asset=html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
      const script=await fetch(base+asset);assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);
    }
  }
  for(const url of ['/assets/missing.js','/js/homes.js','/api/missing']) assert.equal((await fetch(base+url)).status,404);
});

test('development entry redirects pages with their query to Vite',async t => {
  const base=await serve(t,{development:true});
  const response=await fetch(base+'/homes/6?view=rooms',{redirect:'manual'});
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),'http://127.0.0.1:5173/homes/6?view=rooms');
  assert.equal((await fetch(base+'/js/homes.js',{redirect:'manual'})).status,404);
});

test('missing build gives actionable error instead of the old interface',async t => {
  const base=await serve(t,{distDirectory:path.join(__dirname,'nonexistent-build')});
  const response=await fetch(base+'/');assert.equal(response.status,503);
  assert.match(await response.text(),/npm run build/);
});
