# Test Login, Profile, My Details, and the HR Employee Directory

You need **two services running at the same time**, not two logins:

1. **API:** `json-server` reads and updates `api/db.json` on port 3000.
2. **Page server:** VS Code Live Server opens the HTML pages, usually on port 5500.

Keep the API terminal open while using the pages. Closing it stops login and the directory.

## First setup on your computer

Open a terminal in the `Project-1` folder. Check that Node.js and npm are installed:

```bash
node --version
npm --version
```

If either command is missing, install Node.js first. Then run:

```bash
npm install
npm run reset
```

`npm install` creates `node_modules/` for your computer. You do not create or upload that folder. `npm run reset` creates the writable `api/db.json` from `api/db.seed.json`. Run reset again only when you want to discard local test changes.

The repository's current `package-lock.json` is still an empty starter file. The first normal `npm install` will update it; commit that updated lockfile with `package.json` before teammates pull this setup.

## Every time you test

In the project terminal, run:

```bash
npm run api
```

Leave this terminal open. In VS Code, open `common/login/login.html` with **Live Server**. Use the HR demo account:

```text
Email:    hr@company.com
Password: hrPassword123
```

After signing in, you arrive at the **HR Workspace**. Click **Employees** in its sidebar to open the directory. You can also open `hr/employees/employees.html` directly **after** signing in. Opening an HR page before login redirects you to Login. You do not need to log in separately for each screen; the login stores your session in this browser's `localStorage`.

To test the employee path, log out and sign in with:

```text
Email:    lana@company.com
Password: empPassword123
```

That account opens **My Workspace**. Use **My Details** in the employee sidebar or the user name in the navbar for **My Profile**.

## If it does not open

| What you see | What to check |
| --- | --- |
| “Failed to fetch” or “API is offline” | Keep `npm run api` running, then open `http://127.0.0.1:3000/employees` in a browser. You should see JSON. |
| Wrong email or password | Use the credentials above. Older examples mentioning `hr1234`, `/users`, or `/common/home` are from a different sample. |
| Page cannot load | Open the HTML through Live Server, not by double-clicking the file. |
| HR directory sends you to Login | Sign in with the HR account in the same browser first. An EMP account cannot open HR pages. |
| Port 3000 is busy | Stop the other process using port 3000. The page code currently expects this port. |

The active API code is written directly in each screen's `.js` file. The older JSON/localStorage reads are left as `// OLD WAY` comments beside the new `fetch()` calls so you can compare them; comments do not run. The HR directory also uses the API because adding or blocking an employee must affect the same data that Login reads.
