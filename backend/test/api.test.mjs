import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('API preserves history, scopes records, and persists a review', {timeout:30000}, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sentinel-test-'));
  const processHandle = spawn(process.execPath, ['src/index.mjs'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env:{...process.env, PORT:'4099', SENTINEL_DB_PATH:path.join(dir,'test.db')},
    stdio:['ignore','pipe','pipe'], windowsHide:true,
  });
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        processHandle.stdout.on('data', chunk => { if (chunk.toString().includes('listening')) resolve(); });
        processHandle.on('exit', code => reject(new Error(`API exited ${code}`)));
      }),
      new Promise((_, reject) => { const t=setTimeout(() => reject(new Error('API startup timeout')),10000); t.unref(); }),
    ]);
    const request = async (route, token, method='GET', body) => {
      const res = await fetch(`http://127.0.0.1:4099/api${route}`, {
        method, headers:{...(token ? {Authorization:`Bearer ${token}`} : {}), ...(body && !(body instanceof FormData) ? {'Content-Type':'application/json'} : {})},
        body:body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
      return {status:res.status, data:await res.json()};
    };
    assert.equal((await request('/works')).status,401);
    assert.equal((await request('/auth/login',null,'POST',{name:'Tester',roleId:'district'})).status,400);
    const login = await request('/auth/login',null,'POST',{name:'Demo tester',roleId:'ministry'});
    const token = login.data.token;
    const works = (await request('/works',token)).data;
    assert.ok(works.length);
    assert.ok(works.every(w => w.utilized === null));
    const id = encodeURIComponent(works[0].id);
    const review = await request(`/works/${id}/reviews`, token, 'POST', {decision:'request_evidence',note:'Request sanction and dated completion evidence.'});
    assert.equal(review.status,200);
    assert.equal((await request(`/works/${id}/evidence`,token)).data.reviews.length,1);
    assert.equal((await request('/reviews',token)).data.length,1);
    const before=(await request('/ledger',token)).data.length;
    const csv='unique_work_number,work_name,state,constituency,district,sanction_amount,implementing_agency_name,date_of_administrative_approval\nTEST-X,Water tank,Other State,Other Constituency,Other District,50000,Test Agency,01-01-2026';
    const form=new FormData();form.append('file',new Blob([csv]),'sample.csv');
    assert.equal((await request('/ingest',token,'POST',form)).status,200);
    assert.ok((await request('/ledger',token)).data.length > before);
    assert.equal((await request(`/works/${id}/evidence`,token)).data.reviews.length,1);
    const bad=new FormData();bad.append('file',new Blob([csv+'\n'+csv.split('\n')[1]]),'duplicate.csv');
    assert.equal((await request('/ingest',token,'POST',bad)).status,400);
    const d=(await request('/auth/login',null,'POST',{name:'District reviewer',roleId:'district',jurisdiction:'Other District'})).data.token;
    assert.equal((await request('/works',d)).data.length,1);
    assert.deepEqual((await request('/reviews',d)).data,[]);
    assert.equal((await request(`/works/${id}`,d)).status,403);
    assert.ok((await request('/ledger',d)).data.every(r=>r.work==='TEST-X'));
    assert.ok((await request('/network',d)).data.nodes.filter(n=>n.type==='work').every(n=>n.id==='TEST-X'));
    assert.equal((await request('/trends',d)).data.points.length,1);
    assert.equal((await request('/ledger/verify',token,'POST')).data.verified,true);
  } finally {
    const exited=once(processHandle,'exit');processHandle.kill();await exited;
    await rm(dir,{recursive:true,force:true});
  }
});
