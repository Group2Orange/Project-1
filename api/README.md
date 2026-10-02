# Local data API

For a beginner-friendly walkthrough with demo accounts and the HR directory path, read [TESTING.md](TESTING.md).

The project uses a small `json-server` process for shared demo data. It runs on your computer at `http://127.0.0.1:3000`. The browser pages still need a static server such as VS Code Live Server. Open the pages through that server, not as `file://` files.

1. In the project root, run `npm install` once.
2. Run `npm run reset` to copy the tracked sample data into `api/db.json`.
3. Run `npm run api` and leave that terminal open.
4. Open the project with Live Server in another terminal/editor.

`api/db.seed.json` is the tracked sample. `api/db.json` is the writable working copy, ignored by Git. Edits made through the API go into `api/db.json`. Reset replaces those local edits with the sample. Teammates each get their own working copy; this localhost server does **not** sync data between devices.

Login, profile, My Details, and the HR employee directory now call the API directly with `fetch()` in each screen's `.js` file. For example, the directory uses `GET /employees` to list records, `POST /employees` to add one, and `PATCH /employees/:id` to edit or block one. There is no shared data wrapper or mode switch. The original JSON files remain in the repository for reference. Other screens have not yet been moved to the API; their existing data flows are unchanged.

The database already has lists for `tasks`, `policies`, `feedback`, `requests`, `leaveBalances`, and `leaveRequests`. To connect a later page, use the same direct `fetch()` pattern with its list name. Keep the API terminal and Live Server running together. Browser DevTools → Network shows the requests and errors.

This setup is for local education only. The sample stores plain-text passwords and has no server-side authorization. Do not expose the API to the internet or use real employee information.
