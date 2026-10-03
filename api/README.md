# Local data API

For a beginner-friendly walkthrough with demo accounts and the HR directory path, read [TESTING.md](TESTING.md).

The project uses a small `json-server` process for shared demo data. It runs on your computer at `http://127.0.0.1:3000`. The browser pages still need a static server such as VS Code Live Server. Open the pages through that server, not as `file://` files.

1. In the project root, run `npm install` once.
2. Run `npm run reset` to copy the tracked sample data into `api/db.json`.
3. Run `npm run api` and leave that terminal open.
4. Open the project with Live Server in another terminal/editor.

`api/db.seed.json` is the tracked sample. `api/db.json` is the writable working copy, ignored by Git. Edits made through the API go into `api/db.json`. Reset replaces those local edits with the sample, so stop the API terminal before running `npm run reset`; the reset script refuses to run while port 3000 is active and backs up the current database first. Teammates each get their own working copy; this localhost server does **not** sync data between devices.

Login, profile, My Details, the HR employee directory, tasks, leave, helpdesk, feedback, and policies call the API directly with `fetch()` in each screen's `.js` file. The directory uses `GET /employees` to list records, `POST /employees` to add one, and `PATCH /employees/:id` to edit or block one. The employee task board reads and updates `/tasks`; leave requests use `/leaveRequests`; helpdesk uses `/helpdeskRequests` and `/helpdeskDrafts`. The original JSON files remain in the repository as historical examples but active screens no longer use them as data stores. The browser keeps only a small login identity and theme preference in localStorage.

The database has lists for `employees`, `tasks`, `policies`, `feedback`, `leaveBalances`, `leaveRequests`, `helpdeskRequests`, and `helpdeskDrafts`. Keep the API terminal and Live Server running together. Browser DevTools → Network shows requests and errors. The tracked `api/db.seed.json` includes sample leave balances and requests; `api/db.json` keeps your current local edits. Do not run `npm run reset` unless you intend to replace those edits.

## Why withdrawing a request used to wipe employees

json-server 0.17.4 treats fields ending in `Id` as links to other collections. An employee has `id: 1` (its database key) and `employeeId: "EMP-1892"` (its displayed badge number). The default configuration mistakes that badge number for a link to another employee. On **any DELETE**, json-server scans every collection for broken links and deletes those records too. That scan marked all employees for removal when a leave request, task, or helpdesk request was deleted.

`npm run api` now includes `--foreignKeySuffix _ref`. None of our fields use that reserved suffix, so deleting a record only removes the requested record. Existing `employeeId` fields and filters such as `/leaveRequests?employeeId=2` keep working. The pages fetch related data explicitly; do not use `_expand` or `_embed` with the old `Id` convention.

**Restart the API after pulling this fix.** A running process keeps its previous configuration and database in memory. Always stop it before manually editing or restoring `db.json`; otherwise a later API write can overwrite your restored file with the old memory contents. Removing `--watch` alone did not fix the automatic deletion bug.

Run `npm run test:api` to test the old failure and the corrected CRUD flows. The tests use temporary databases and temporary localhost ports; they never modify your working `api/db.json`.

This setup is for local education only. The sample stores plain-text passwords and has no server-side authorization. Do not expose the API to the internet or use real employee information.
