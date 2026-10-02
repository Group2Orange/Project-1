# Local data API

For a beginner-friendly walkthrough with demo accounts and the HR directory path, read [TESTING.md](TESTING.md).

The project uses a small `json-server` process for shared demo data. It runs on your computer at `http://127.0.0.1:3000`. The browser pages still need a static server such as VS Code Live Server. Open the pages through that server, not as `file://` files.

1. In the project root, run `npm install` once.
2. Run `npm run reset` to copy the tracked sample data into `api/db.json`.
3. Run `npm run api` and leave that terminal open.
4. Open the project with Live Server in another terminal/editor.

`api/db.seed.json` is the tracked sample. `api/db.json` is the writable working copy, ignored by Git. Edits made through the API go into `api/db.json`. Reset replaces those local edits with the sample. Teammates each get their own working copy; this localhost server does **not** sync data between devices.

Login, profile, My Details, the HR employee directory, tasks, leave, helpdesk, feedback, and policies call the API directly with `fetch()` in each screen's `.js` file. The directory uses `GET /employees` to list records, `POST /employees` to add one, and `PATCH /employees/:id` to edit or block one. The employee task board reads and updates `/tasks`; leave requests use `/leaveRequests`; helpdesk uses `/helpdeskRequests` and `/helpdeskDrafts`. The original JSON files remain in the repository as historical examples but active screens no longer use them as data stores. The browser keeps only a small login identity and theme preference in localStorage.

The database has lists for `employees`, `tasks`, `policies`, `feedback`, `leaveBalances`, `leaveRequests`, `helpdeskRequests`, and `helpdeskDrafts`. Keep the API terminal and Live Server running together. Browser DevTools → Network shows requests and errors. The tracked `api/db.seed.json` includes sample leave balances and requests; `api/db.json` keeps your current local edits. Do not run `npm run reset` unless you intend to replace those edits.

This setup is for local education only. The sample stores plain-text passwords and has no server-side authorization. Do not expose the API to the internet or use real employee information.
