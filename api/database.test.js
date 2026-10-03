// Real HTTP requests against disposable JSON files. Never edits api/db.json.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { setTimeout: wait } = require('node:timers/promises');

const projectRoot = path.join(__dirname, '..');
const apiCommand = require('../package.json').scripts.api.split(' ');
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.seed.json'), 'utf8'));
const meetings = require('../shared/helpdesk-meetings.js');

async function startApi(t, oldConfiguration = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'teamspace-db-test-'));
  const databasePath = path.join(directory, 'db.json');
  const fixture = structuredClone(seed);
  fixture.policies = [{ id: 1, title: 'Test policy', category: 'General', description: 'Keep this policy.' }];
  fs.writeFileSync(databasePath, JSON.stringify(fixture, null, 2));

  const portFinder = net.createServer();
  portFinder.listen(0, '127.0.0.1');
  await once(portFinder, 'listening');
  const port = portFinder.address().port;
  await new Promise(resolve => portFinder.close(resolve));

  // Use the actual npm command so a future configuration regression fails this test.
  const args = apiCommand.slice(1);
  args[0] = databasePath;
  args[args.indexOf('--port') + 1] = String(port);
  if (oldConfiguration) args[args.indexOf('--foreignKeySuffix') + 1] = 'Id';
  const child = spawn(process.execPath, [require.resolve('json-server/lib/cli/bin'), ...args], {
    cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      await stopped;
    }
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`API exited: ${output}`);
    try {
      const response = await fetch(`${baseUrl}/db`);
      if (response.ok) { ready = true; break; }
    } catch { /* Wait until the temporary API is listening. */ }
    await wait(50);
  }
  assert.ok(ready, `API did not start: ${output}`);

  async function request(resource, method = 'GET', data) {
    const response = await fetch(`${baseUrl}${resource}`, {
      method,
      ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {})
    });
    assert.ok(response.ok, `${method} ${resource}: ${response.status} ${await response.clone().text()}`);
    return response.json();
  }

  async function readSavedDatabase() {
    const memory = await request('/db');
    // The CLI's asynchronous writer can finish shortly after the HTTP response.
    for (let attempt = 0; attempt < 100; attempt++) {
      const disk = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
      if (JSON.stringify(disk) === JSON.stringify(memory)) return disk;
      await wait(10);
    }
    assert.fail('API memory and the saved JSON did not match.');
  }

  return { request, readSavedDatabase, fixture };
}

function assertOtherCollections(before, after, changed) {
  for (const collection of Object.keys(before)) {
    if (!changed.includes(collection)) {
      assert.deepEqual(after[collection], before[collection], `${collection} was unexpectedly changed`);
    }
  }
}

test('reproduces the old bug: withdrawing a leave request deletes all employees', async t => {
  const { request, readSavedDatabase } = await startApi(t, true);
  await request('/leaveRequests/1', 'DELETE');
  const saved = await readSavedDatabase();
  assert.equal(saved.employees.length, 0);
});

test('configured API saves CRUD changes without deleting unrelated records', async t => {
  const { request, readSavedDatabase, fixture } = await startApi(t);

  await t.test('create and withdraw leave: every other collection survives', async () => {
    const created = await request('/leaveRequests', 'POST', {
      employeeId: 2, type: 'Annual PTO', startDate: '2026-12-01',
      endDate: '2026-12-02', days: 2, status: 'Pending', reason: 'API regression test'
    });
    let saved = await readSavedDatabase();
    assertOtherCollections(fixture, saved, ['leaveRequests']);
    assert.ok(saved.leaveRequests.some(item => item.id === created.id));
    await request(`/leaveRequests/${created.id}`, 'DELETE');
    saved = await readSavedDatabase();
    assert.deepEqual(saved, fixture);
  });

  await t.test('delete helpdesk requests, drafts, and tasks without losing employees or policies', async () => {
    for (const collection of ['helpdeskRequests', 'helpdeskDrafts', 'tasks']) {
      const before = await readSavedDatabase();
      const created = await request(`/${collection}`, 'POST', { employeeId: 2, subject: 'Test only' });
      await request(`/${collection}/${encodeURIComponent(created.id)}`, 'DELETE');
      const after = await readSavedDatabase();
      assert.deepEqual(after, before);
    }
  });

  await t.test('add, edit, and block an employee and create/edit policies', async () => {
    const before = await readSavedDatabase();
    const employee = await request('/employees', 'POST', {
      employeeId: 'EMP-TEST', name: 'Test Employee', status: 'Active'
    });
    await request(`/employees/${employee.id}`, 'PATCH', { name: 'Updated Employee', status: 'Blocked' });
    const policy = await request('/policies', 'POST', { title: 'New policy', category: 'General', description: 'Test' });
    await request(`/policies/${policy.id}`, 'PATCH', { title: 'Updated policy' });
    const saved = await readSavedDatabase();
    assertOtherCollections(before, saved, ['employees', 'policies']);
    assert.deepEqual(saved.employees.slice(0, before.employees.length), before.employees);
    assert.equal(saved.employees.find(item => item.id === employee.id).status, 'Blocked');
    assert.equal(saved.policies.find(item => item.id === policy.id).title, 'Updated policy');
    // Another DELETE must also preserve the newly created employee's badge field.
    const leave = await request('/leaveRequests', 'POST', { employeeId: employee.id, status: 'Pending' });
    await request(`/leaveRequests/${leave.id}`, 'DELETE');
    assert.deepEqual(await readSavedDatabase(), saved);
  });

  await t.test('concurrent submissions persist without losing other collections', async () => {
    const before = await readSavedDatabase();
    const created = await Promise.all(Array.from({ length: 6 }, (_, number) =>
      request('/leaveRequests', 'POST', { employeeId: 2, status: 'Pending', reason: `Concurrent test ${number}` })
    ));
    let saved = await readSavedDatabase();
    assertOtherCollections(before, saved, ['leaveRequests']);
    for (const item of created) assert.ok(saved.leaveRequests.some(record => record.id === item.id));
    await Promise.all(created.map(item => request(`/leaveRequests/${item.id}`, 'DELETE')));
    saved = await readSavedDatabase();
    assert.deepEqual(saved, before);
  });

  await t.test('Zoom demo approval and accepted reschedule save one shared room', async () => {
    const before = await readSavedDatabase();
    const ticket = await request('/helpdeskRequests', 'POST', {
      employeeId: 2, type: 'meeting', platform: 'Zoom', status: 'Pending',
      subject: 'Demo meeting test', date: '2026-12-01', timeFrom: '10:00', timeTo: '10:30'
    });
    const approved = await request(`/helpdeskRequests/${ticket.id}`, 'PATCH', meetings.approvalPatch(ticket, 'Approved'));
    assert.equal(approved.meetingProvider, 'Jitsi');
    assert.match(approved.meetingRoom, /^TeamSpaceHR-/);
    assert.equal(approved.meetingLink, `https://meet.jit.si/${approved.meetingRoom}`);
    assert.ok(meetings.canReschedule(approved), 'Approved meetings must have the Reschedule action');
    const proposed = await request(`/helpdeskRequests/${ticket.id}`, 'PATCH', {
      status: 'Reschedule Requested',
      rescheduleRequest: { date: '2026-12-02', timeFrom: '11:00', timeTo: '11:30', proposedBy: 'HR' }
    });
    const accepted = await request(`/helpdeskRequests/${ticket.id}`, 'PATCH', {
      ...meetings.roomPatch(proposed), status: 'Approved', date: proposed.rescheduleRequest.date,
      timeFrom: proposed.rescheduleRequest.timeFrom, timeTo: proposed.rescheduleRequest.timeTo,
      rescheduleRequest: null
    });
    assert.equal(accepted.meetingRoom, approved.meetingRoom);
    assert.equal(accepted.date, '2026-12-02');
    const employeeView = await request(`/helpdeskRequests?employeeId=${ticket.employeeId}`);
    assert.equal(employeeView.find(item => item.id === ticket.id).meetingRoom, approved.meetingRoom);
    const saved = await readSavedDatabase();
    assert.equal(saved.helpdeskRequests.find(item => item.id === ticket.id).meetingRoom, approved.meetingRoom);
    assertOtherCollections(before, saved, ['helpdeskRequests']);
    await request(`/helpdeskRequests/${ticket.id}`, 'DELETE');
    assert.deepEqual(await readSavedDatabase(), before);
  });

  await t.test('Google Meet approval keeps the manual link and creates no demo room', async () => {
    const before = await readSavedDatabase();
    const ticket = await request('/helpdeskRequests', 'POST', {
      employeeId: 2, type: 'meeting', platform: 'Google Meet', status: 'Pending'
    });
    const patch = meetings.approvalPatch(ticket, '', 'https://meet.google.com/abc-defg-hij');
    const approved = await request(`/helpdeskRequests/${ticket.id}`, 'PATCH', patch);
    assert.equal(approved.meetingLink, 'https://meet.google.com/abc-defg-hij');
    assert.equal(approved.meetingRoom, undefined);
    assert.equal(approved.meetingProvider, undefined);
    await request(`/helpdeskRequests/${ticket.id}`, 'DELETE');
    assert.deepEqual(await readSavedDatabase(), before);
  });
});

test('counter-proposal approval reuses the room and selects the employee-proposed time', () => {
  const ticket = {
    id: 10, type: 'meeting', platform: 'Zoom', status: 'Reschedule Requested',
    meetingProvider: 'Jitsi', meetingRoom: 'TeamSpaceHR-existing-room',
    rescheduleRequest: { date: '2026-12-03', timeFrom: '12:00', timeTo: '12:30', proposedBy: 'EMP' }
  };
  const patch = meetings.approvalPatch(ticket, 'New time accepted');
  assert.equal(patch.meetingRoom, ticket.meetingRoom);
  assert.equal(patch.date, ticket.rescheduleRequest.date);
  assert.equal(patch.timeFrom, ticket.rescheduleRequest.timeFrom);
  assert.equal(patch.rescheduleRequest, null);
  assert.equal(meetings.canApprove({ ...ticket, rescheduleRequest: { ...ticket.rescheduleRequest, proposedBy: 'HR' } }), false);
  assert.equal(meetings.canReschedule({ ...ticket, status: 'Rejected' }), false);
  assert.equal(meetings.canReschedule({ ...ticket, type: 'ticket' }), false);
  assert.throws(() => meetings.approvalPatch({ ...ticket, status: 'Rejected' }, ''), /no longer awaiting approval/);
  assert.throws(() => meetings.approvalPatch({ type: 'meeting', platform: 'Google Meet', status: 'Pending' }, '', 'https://example.com/'), /valid Google Meet link/);
});

test('meeting links resolve correctly after changing the server port or project folder', () => {
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(projectRoot, 'shared/helpdesk-meetings.js'), 'utf8');
  for (const base of ['http://127.0.0.1:5501/Project-1', 'http://localhost:5500']) {
    const context = vm.createContext({ document: { currentScript: { src: `${base}/shared/helpdesk-meetings.js` } }, window: {}, URL, crypto });
    vm.runInContext(source, context);
    const url = context.window.HelpdeskMeetings.joinLink({ id: 42, type: 'meeting', platform: 'Zoom', meetingProvider: 'Jitsi', meetingRoom: 'TeamSpaceHR-test' });
    assert.equal(url, `${base}/common/meetingZoom/index.html?request=42`);
  }
});

test('legacy meeting times display and prefill without a duplicate AM/PM suffix', () => {
  assert.equal(meetings.normaliseTime('02:00 PM'), '14:00');
  assert.equal(meetings.normaliseTime('12:00 AM'), '00:00');
  assert.equal(meetings.normaliseTime('10:30'), '10:30');
  assert.equal(meetings.normaliseTime('25:70'), '');
});
