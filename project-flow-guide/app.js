// Read-only teaching simulation. The snippets below are short excerpts from the linked source files.
// When a screen changes, update its entry here (the README of this folder explains it).
//
// Writing a snippet inside a backtick string:
//   a backtick is written \`  and  ${  is written \${  and a backslash is written \\
const flows = [
  {
    id: "setup",
    group: "FOUNDATION",
    title: "Start the project",
    description: "Two local processes serve the pages and the writable JSON API.",
    caveat: "The API writes to api/db.json on the computer running json-server. LocalStorage stays inside one browser/profile.",
    steps: [
      {
        title: "Prepare the API data",
        kind: "Terminal",
        source: "package.json",
        code: `"reset": "node api/reset.js"`,
        input: "npm install, then npm run reset",
        result: "api/db.json is created from the seed",
        why: "The seed is a starting snapshot. Resetting later replaces changes in the working API file.",
        state: { screen: "Project files ready", session: "No signed-in user", browser: "No app data yet", api: "api/db.json seeded" }
      },
      {
        title: "Run json-server",
        kind: "API",
        source: "package.json",
        code: `"api": "json-server api/db.json --host 127.0.0.1 --port 3000 --foreignKeySuffix _ref"`,
        input: "npm run api",
        result: "GET /employees, /policies, /feedback become available",
        why: "The browser cannot write JSON files directly; json-server handles GET, POST, PATCH, PUT and DELETE.",
        state: { screen: "Browser still closed", session: "No signed-in user", browser: "No app data yet", api: "Listening on 127.0.0.1:3000" }
      },
      {
        title: "Open the website",
        kind: "Browser",
        source: "index.html",
        code: `<li><a href="common/login/login.html">1. Login</a></li>
<li><a href="common/home/home.html">2. Home and Services</a></li>`,
        input: "Open index.html through Live Server and choose a page",
        result: "Selected page loads at the Live Server origin",
        why: "The site and API use different ports. Keep both processes running while testing.",
        state: { screen: "Index, then chosen page", session: "No signed-in user", browser: "Origin: Live Server (for example :5500)", api: "Separate origin: :3000" }
      }
    ]
  },
  {
    id: "login",
    group: "IDENTITY",
    title: "Sign in and choose a role",
    description: "The login form checks an employee record, stores a small session, and routes by role.",
    caveat: "This is a teaching demo: the browser sends a password to a local json-server query. It is not production-grade authentication.",
    steps: [
      {
        title: "Submit credentials",
        kind: "Input",
        source: "common/login/login.js",
        code: `loginForm.onsubmit = async function (event) {
  event.preventDefault();
  setLoginError("");
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  // Ask the API for a matching record.
};`,
        input: "Email + password in login form",
        result: "Default form navigation is stopped",
        why: "JavaScript controls the request and can show validation errors on the same page.",
        state: { screen: "Login form", session: "No signed-in user", browser: "Credentials only in form fields", api: "No request yet" }
      },
      {
        title: "Look up employee",
        kind: "GET",
        source: "common/login/login.js",
        code: `const response = await fetch(\`\${API}/employees?email=\${encodeURIComponent(email)}&password=\${encodeURIComponent(password)}\`);
const matches = await response.json();
await signIn(matches[0]);`,
        input: "GET /employees?email=…&password=…",
        result: "Matching employee, or “Incorrect email or password”",
        why: "The login is reading the API’s employee collection, not Data/employee.json.",
        state: { screen: "Login waits for response", session: "Not saved yet", browser: "No employee list cached", api: "Reads /employees from api/db.json" }
      },
      {
        title: "Reject blocked accounts",
        kind: "Guard",
        source: "common/login/login.js",
        code: `if (employee.status !== "Active" && employee.status !== "Inactive") {
  setLoginError("This account is not active. Please contact HR.");
  return;
}`,
        input: "Matched account status",
        result: "Blocked users stop here",
        why: "The account record is kept, but a blocked account cannot enter the portal.",
        state: { screen: "Login error if blocked", session: "No session for blocked user", browser: "No employee record stored", api: "Status remains unchanged" }
      },
      {
        title: "Save identity and route",
        kind: "Route",
        source: "common/login/login.js",
        code: `localStorage.setItem("loggedUser", JSON.stringify(loggedUser));
if (employee.firstAttend === true) {
  location.href = "../reset-password/reset-password.html";
} else if (employee.role === "HR") {
  location.href = "../../hr/workspace/workspace.html";
} else {
  location.href = "../../employee/MyWOrkSpace/MyWOrkSpace.html";
}`,
        input: "Valid HR or EMP employee",
        result: "First login → password reset; otherwise → role workspace",
        why: "Only selected identity fields are stored locally. The full employee list and password are not copied into the session.",
        state: { screen: "HR or employee workspace", session: "loggedUser: id, role, name, email…", browser: "Nothing else is stored", api: "Employee record is unchanged" }
      }
    ]
  },
  {
    id: "first-login",
    group: "IDENTITY",
    title: "First-time password change",
    description: "A newly created employee must set a new password before entering the workspace.",
    caveat: "The password is currently stored in plain text in the demo JSON database. A real deployment needs a backend that hashes passwords.",
    steps: [
      {
        title: "HR creates initial access",
        kind: "POST",
        source: "hr/employees/employees.js",
        code: `// A new employee always gets a password (a random one when HR cleared the box).
if (!editingId && !password) {
  password = makeInitialPassword();
}
// A new password means the employee must choose another one at the first sign-in.
if (password) {
  data.password = password;
  data.firstAttend = true;
}
const response = await fetch(editingId ? \`\${API}/employees/\${editingId}\` : \`\${API}/employees\`, {
  method: editingId ? "PATCH" : "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});`,
        input: "Add employee in HR directory",
        result: "Employee record with firstAttend: true",
        why: "The directory generates an initial password when HR leaves that field empty.",
        state: { screen: "HR employee directory", session: "HR remains signed in", browser: "No new employee data cached", api: "POST /employees → new JSON record" }
      },
      {
        title: "Login detects first visit",
        kind: "Route",
        source: "common/login/login.js",
        code: `if (employee.firstAttend === true) {
  location.href = "../reset-password/reset-password.html";
}`,
        input: "New employee signs in with initial password",
        result: "Reset Password screen opens",
        why: "The workspace route is delayed until the first password update succeeds.",
        state: { screen: "Reset Password", session: "New employee identity stored", browser: "Initial password is not stored in loggedUser", api: "firstAttend is still true" }
      },
      {
        title: "Save new password",
        kind: "PATCH",
        source: "common/reset-password/reset-password.js",
        code: `const response = await fetch(\`\${API}/employees/\${session.id}\`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: newPassword, firstAttend: false })
});
location.replace(workspaceFor(session.role));`,
        input: "Valid matching password fields",
        result: "JSON updated; role workspace opens",
        why: "The flag changes to false, so later sign-ins skip this screen.",
        state: { screen: "Role workspace", session: "Same loggedUser identity", browser: "No password stored in session", api: "PATCH /employees/:id → firstAttend false" }
      }
    ]
  },
  {
    id: "navigation",
    group: "IDENTITY",
    title: "Navbar and role boundaries",
    description: "Shared navigation loads the proper template and protects employee and HR pages.",
    caveat: "These are client-side route checks for a demo. json-server endpoints themselves do not enforce roles.",
    steps: [
      {
        title: "Read the saved identity",
        kind: "localStorage",
        source: "shared/navbar.js",
        code: `user = JSON.parse(localStorage.getItem("loggedUser"));
if (user === null || !user.id || String(user.name || "").trim() === "") {
  return null;
}
if (user.role !== "HR" && user.role !== "EMP") {
  return null;
}`,
        input: "Any protected page loads",
        result: "Role is available to the navbar",
        why: "One small session value drives the shared navigation across pages.",
        state: { screen: "Requested page", session: "loggedUser read", browser: "Role available to UI", api: "No request by navbar" }
      },
      {
        title: "Apply route guard",
        kind: "Guard",
        source: "shared/navbar.js",
        code: `if (isProtectedPage && user === null) {
  location.replace("../../common/login/login.html");
  return;
}
if (isProtectedPage && user.role !== expectedRole && !hrReadsPolicies) {
  if (user.role === "EMP") {
    location.replace("../../employee/MyWOrkSpace/MyWOrkSpace.html");
  } else {
    location.replace("../../hr/workspace/workspace.html");
  }
  return;
}`,
        input: "URL + saved role",
        result: "Wrong-role pages redirect to the correct workspace",
        why: "HR may read the employee policies page as one deliberate exception.",
        state: { screen: "Allowed page or redirect", session: "Role compared with page", browser: "No data mutation", api: "No request by guard" }
      },
      {
        title: "Insert shared navbar",
        kind: "UI",
        source: "shared/navbar.js",
        code: `// Shared screens use the navbar of the person who is logged in.
let type = navbarType;
if (hrReadsPolicies) {
  type = "hr";
} else if (path.includes("/common/") && user !== null && user.role === "EMP") {
  type = "employee";
}

const response = await fetch("../../shared/navbar-" + type + ".html");
placeholder.outerHTML = await response.text();`,
        input: "data-navbar in page HTML",
        result: "HR or employee navbar appears",
        why: "The templates are shared files, so one nav change can update many screens.",
        state: { screen: "Shared navbar inserted", session: "Name and role shown", browser: "HTML template fetched", api: "No JSON database write" }
      }
    ]
  },
  {
    id: "profile",
    group: "EMPLOYEE",
    title: "Profile and My Details",
    description: "The profile and details pages fetch the latest employee record; profile edits PATCH it.",
    caveat: "The profile page is shared by roles. My Details is employee-only; HR uses its own directory and employee detail screens.",
    steps: [
      {
        title: "Fetch the current profile",
        kind: "GET",
        source: "common/profile/profile.js",
        code: `const response = await fetch(\`\${API}/employees/\${user.id}\`);
showProfile(await response.json());`,
        input: "Open Profile after login",
        result: "Current API values displayed",
        why: "The page does not rely on an old copy of all employee details in localStorage.",
        state: { screen: "Profile", session: "ID identifies current user", browser: "Display values in DOM", api: "GET /employees/:id" }
      },
      {
        title: "Read My Details",
        kind: "GET",
        source: "employee/details/details.js",
        code: `// navbar.js already sends everyone without an employee session to the right page.
if (session === null || session.role !== "EMP") {
  return;
}
const response = await fetch(\`\${API}/employees/\${session.id}\`);
showEmployee(await response.json());`,
        input: "Employee opens My Details",
        result: "Employee fields shown; HR redirected",
        why: "The detail view uses the signed-in ID and a role check.",
        state: { screen: "My Details", session: "EMP ID read", browser: "Current fields shown", api: "GET /employees/:id" }
      },
      {
        title: "Save a profile edit",
        kind: "PATCH",
        source: "common/edit-profile/edit-profile.js",
        code: `const changes = { name: name, phone: "+962" + number };
if (newImage) {
  changes.image = newImage;
}
const response = await fetch(\`\${API}/employees/\${user.id}\`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(changes)
});
localStorage.setItem("loggedUser", JSON.stringify(session));
window.updateNavbarIdentity();`,
        input: "Edit name, phone, or image and Save",
        result: "API record updated; session label refreshed",
        why: "The JSON change persists on the API host; the small local identity is refreshed for the navbar.",
        state: { screen: "Updated profile", session: "Name/image refreshed", browser: "Current form fields", api: "PATCH /employees/:id" }
      }
    ]
  },
  {
    id: "tasks",
    group: "EMPLOYEE",
    title: "My Tasks and workspace progress",
    description: "Employee tasks load from and save to the local JSON API.",
    caveat: "Tasks are in api/db.json on the API host. Another browser using that same server sees updated task data after it reloads.",
    steps: [
      {
        title: "Load my tasks",
        kind: "GET",
        source: "employee/my-tasks/my-tasks.js",
        code: `const response = await fetch(\`\${API}/tasks?employeeId=\${user.id}\`);
tasks = await response.json();`,
        input: "Open My Tasks",
        result: "Only signed-in employee tasks render",
        why: "The employee ID filters the shared tasks collection.",
        state: { screen: "My Tasks board", session: "Employee identity in loggedUser", browser: "No task copy in localStorage", api: "GET /tasks?employeeId=…" }
      },
      {
        title: "Save task changes",
        kind: "PUT",
        source: "employee/my-tasks/my-tasks.js",
        code: `const response = await fetch(\`\${API}/tasks/\${task.id}\`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(task)
});`,
        input: "Move task or submit for review",
        result: "Changed task is written to api/db.json",
        why: "The board saves changed records through the API.",
        state: { screen: "Updated task board", session: "Employee identity in loggedUser", browser: "Current tasks in page memory", api: "PUT /tasks/:id" }
      },
      {
        title: "Refresh sidebar progress",
        kind: "GET",
        source: "shared/employee-sidebar.js",
        code: `const response = await fetch("http://127.0.0.1:3000/tasks?employeeId=" + encodeURIComponent(user.id));
tasks = await response.json();
if (tasks.length > 0) {
  progress = Math.round(completedCount / tasks.length * 100);
}`,
        input: "Open page, or a task changes (the board calls updateSidebarTasks())",
        result: "Progress and task count recalculate",
        why: "The sidebar derives progress from current API task statuses.",
        state: { screen: "Sidebar progress updated", session: "Employee identity in loggedUser", browser: "No task copy in localStorage", api: "GET /tasks?employeeId=…" }
      },
      {
        title: "Preview tasks on workspace",
        kind: "GET",
        source: "employee/MyWOrkSpace/MyWOrkSpace.js",
        code: `const response = await fetch(\`\${API}/tasks?employeeId=\${user.id}\`);
tasks = await response.json();`,
        input: "Open My Workspace",
        result: "Top three active tasks appear",
        why: "The workspace uses the same API collection as My Tasks.",
        state: { screen: "Employee workspace", session: "Employee identity in loggedUser", browser: "Preview in page memory", api: "GET /tasks?employeeId=…" }
      }
    ]
  },
  {
    id: "leave",
    group: "EMPLOYEE",
    title: "Leave & Time Off",
    description: "Leave balances and requests come from the local API; submissions are shared on that API host.",
    caveat: "The sample balances and requests are in api/db.seed.json and api/db.json. A new employee receives a default balance when HR adds their account.",
    steps: [
      {
        title: "Open the request dialog",
        kind: "Route",
        source: "employee/MyWOrkSpace/MyWOrkSpace.html",
        code: `<a class="workspace-action" href="../Leave&amp;TimeOff/Leave&amp;TimeOff.html#request-time-off">`,
        input: "Click Request Time Off",
        result: "Leave page opens its dialog",
        why: "The hash signals the existing modal to open.",
        state: { screen: "Leave request modal", session: "Employee identity in loggedUser", browser: "URL hash only", api: "No write" }
      },
      {
        title: "Load employee leave data",
        kind: "GET",
        source: "employee/Leave&TimeOff/Leave&TimeOff.js",
        code: `const responses = [];
for (const url of urls) {
  responses.push(await fetch(url));
}
const balances = await responses[1].json();
balance = balances[0] || null;
leaveRequests = await responses[2].json();`,
        input: "Leave page loads",
        result: "Current employee balance and requests display",
        why: "The page reads /employees, /leaveBalances, and /leaveRequests by employee ID.",
        state: { screen: "Leave balances and history", session: "Employee identity in loggedUser", browser: "No leave data saved locally", api: "GET three API resources" }
      },
      {
        title: "Submit leave request",
        kind: "POST",
        source: "employee/Leave&TimeOff/Leave&TimeOff.js",
        code: `const response = await fetch(\`\${API}/leaveRequests\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(request)
});`,
        input: "Submit validated dates and reason",
        result: "Pending request saved to JSON API",
        why: "HR Leave Requests can see and decide on the same record.",
        state: { screen: "New pending request", session: "Employee identity in loggedUser", browser: "No leave request in localStorage", api: "POST /leaveRequests" }
      },
      {
        title: "HR approves or rejects",
        kind: "PATCH",
        source: "hr/requests/requests.js",
        code: `const changes = { status: status, reviewer: session.name };
const response = await fetch(\`\${API}/leaveRequests/\${request.id}\`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(changes)
});`,
        input: "HR clicks Approve or Reject",
        result: "Status persists; approval updates balance used",
        why: "The HR screen reads all requests and writes a decision through the API.",
        state: { screen: "HR Leave Requests", session: "Employee identity in loggedUser", browser: "No duplicate local request store", api: "PATCH /leaveRequests/:id" }
      }
    ]
  },
  {
    id: "helpdesk",
    group: "EMPLOYEE",
    title: "Helpdesk support",
    description: "Helpdesk drafts, tickets, and meetings use the local JSON API.",
    caveat: "Requests are filtered by employeeId. The current local json-server is an educational demo and does not enforce server-side authorization.",
    steps: [
      {
        title: "Load my tickets and draft",
        kind: "GET",
        source: "employee/helpDesk/helpDesk.js",
        code: `const requestsResponse = await fetch(\`\${API}/helpdeskRequests?employeeId=\${employeeId}\`);
const draftsResponse = await fetch(\`\${API}/helpdeskDrafts?employeeId=\${employeeId}\`);`,
        input: "Open Helpdesk",
        result: "Saved tickets and draft render",
        why: "The page does not read helpdesk data from localStorage.",
        state: { screen: "Helpdesk", session: "Employee identity in loggedUser", browser: "Tickets in page memory", api: "GET /helpdeskRequests and /helpdeskDrafts" }
      },
      {
        title: "Save a draft",
        kind: "POST / PATCH",
        source: "employee/helpDesk/helpDesk.js",
        code: `// PATCH changes the draft that exists. POST makes the first draft.
let url = \`\${API}/helpdeskDrafts\`;
let method = "POST";
if (helpdeskDraft) {
  url = \`\${API}/helpdeskDrafts/\${helpdeskDraft.id}\`;
  method = "PATCH";
}
const response = await fetch(url, {
  method: method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(draft)
});`,
        input: "Click Save Draft",
        result: "Draft persists on API host",
        why: "A later visit can reload the same draft.",
        state: { screen: "Draft saved", session: "Employee identity in loggedUser", browser: "No helpdeskDraft localStorage key", api: "POST or PATCH /helpdeskDrafts" }
      },
      {
        title: "Submit a ticket or meeting",
        kind: "POST",
        source: "employee/helpDesk/helpDesk.js",
        code: `const response = await fetch(\`\${API}/helpdeskRequests\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(request)
});`,
        input: "Click Submit",
        result: "New ticket appears; draft is removed",
        why: "The meeting card is derived from saved meeting-type requests.",
        state: { screen: "Recent support tickets", session: "Employee identity in loggedUser", browser: "No helpdeskRequests localStorage key", api: "POST /helpdeskRequests" }
      }
    ]
  },
  {
    id: "feedback",
    group: "CROSS-ROLE",
    title: "Submit feedback",
    description: "A contact/feedback form POSTs a submission into the API’s feedback collection.",
    caveat: "Feedback is API-backed and visible to the HR inbox on that API host.",
    steps: [
      {
        title: "Build submission",
        kind: "Input",
        source: "common/contact/contact.js",
        code: `const feedback = {
  employeeId: user && user.id ? String(user.id) : null,
  name: anonymous ? "Anonymous" : (user ? user.name : "Guest User"),
  category: selectedCategory,
  subject: subject,
  message: message,
  createdAt: new Date().toISOString(),
  priority: null,
  read: false
};`,
        input: "Category, subject, message, optional anonymity",
        result: "Feedback object prepared",
        why: "The payload includes enough information for HR to sort and review the item.",
        state: { screen: "Feedback form", session: "Identity read if present", browser: "Submission in memory", api: "No write yet" }
      },
      {
        title: "Send to API",
        kind: "POST",
        source: "common/contact/contact.js",
        code: `const response = await fetch(\`\${API}/feedback\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(feedback)
});`,
        input: "Click Send",
        result: "New feedback record written to api/db.json",
        why: "HR can read this same server-side collection.",
        state: { screen: "Success message", session: "Identity unchanged", browser: "No feedback copy required", api: "POST /feedback" }
      }
    ]
  },
  {
    id: "hr-directory",
    group: "HR",
    title: "Employee directory",
    description: "HR lists, filters, adds, edits, blocks, and opens employee records.",
    caveat: "The page uses direct json-server calls. The browser-side HR guard does not secure API endpoints against direct access.",
    steps: [
      {
        title: "Load and filter",
        kind: "GET",
        source: "hr/employees/employees.js",
        code: `const response = await fetch(\`\${API}/employees\`);
employees = await response.json();
const result = employees.filter(function (person) {
  const name = String(person.name || "").toLowerCase();
  const email = String(person.email || "").toLowerCase();
  const team = String(person.department || "").toLowerCase();
  const matchesSearch = name.includes(query) || email.includes(query) || team.includes(query);
  return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
});`,
        input: "Open directory or type a search",
        result: "Employee table and counts render",
        why: "Search and filters run on the loaded array in this browser.",
        state: { screen: "HR directory", session: "HR identity shown", browser: "Employee array in page memory", api: "GET /employees" }
      },
      {
        title: "Add or edit employee",
        kind: "POST / PATCH",
        source: "hr/employees/employees.js",
        code: `const response = await fetch(editingId ? \`\${API}/employees/\${editingId}\` : \`\${API}/employees\`, {
  method: editingId ? "PATCH" : "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});`,
        input: "Submit employee dialog",
        result: "New or changed employee saved",
        why: "A POST creates; a PATCH updates the record in api/db.json.",
        state: { screen: "Directory refreshed", session: "HR identity unchanged", browser: "List reloaded", api: "POST or PATCH /employees" }
      },
      {
        title: "Block without deleting",
        kind: "PATCH",
        source: "hr/employees/employees.js",
        code: `const nextStatus = person.status === "Blocked" ? "Active" : "Blocked";
const response = await fetch(\`\${API}/employees/\${person.id}\`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: nextStatus })
});`,
        input: "Confirm Block or Unblock",
        result: "Status changes; employee record remains",
        why: "Login rejects Blocked accounts. The current HR account cannot block itself in this UI.",
        state: { screen: "Updated status badge", session: "HR identity unchanged", browser: "List reloaded", api: "PATCH status in /employees/:id" }
      },
      {
        title: "Open employee details",
        kind: "Route",
        source: "hr/employees/employees.js",
        code: `function detailUrl(id) {
  return \`../employee-details/employee-details.html?id=\${id}\`;
}

// Clicking a row (or pressing Enter on it) opens the details page.
row.onclick = function () {
  location.href = detailUrl(person.id);
};`,
        input: "Click row or eye icon",
        result: "Selected employee details page opens",
        why: "The record ID in the URL tells the detail page which employee to load.",
        state: { screen: "HR employee details", session: "HR identity unchanged", browser: "URL has ?id=…", api: "Detail page can GET selected record" }
      }
    ]
  },
  {
    id: "hr-policies",
    group: "HR",
    title: "Manage company policies",
    description: "HR adds or edits policies. The employee page reads the same API collection.",
    caveat: "HR navbar Policies opens the read-only employee page. HR sidebar Policies opens the management screen.",
    steps: [
      {
        title: "Load policies",
        kind: "GET",
        source: "hr/policies/policies.js",
        code: `const response = await fetch(\`\${API}/policies\`);
policies = await response.json();
showPolicies();`,
        input: "Open HR Policies in sidebar",
        result: "Editable directory of current policies",
        why: "The page uses the API collection rather than a hard-coded handbook.",
        state: { screen: "HR policy management", session: "HR identity shown", browser: "Policies in page memory", api: "GET /policies" }
      },
      {
        title: "Add a policy",
        kind: "POST",
        source: "hr/policies/policies.js",
        code: `// POST adds a new policy, PATCH changes the one we are editing.
const response = await fetch(adding ? \`\${API}/policies\` : \`\${API}/policies/\${editingId}\`, {
  method: adding ? "POST" : "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(policy)
});`,
        input: "Title, category, description",
        result: "New policy in API database",
        why: "The read-only employee screen can load the new record.",
        state: { screen: "New HR policy card", session: "HR identity unchanged", browser: "Policies array refreshed", api: "POST /policies" }
      },
      {
        title: "Employee reads policies",
        kind: "GET",
        source: "employee/policies/EMPpolicies.js",
        code: `const response = await fetch(\`\${API}/policies\`);
const allPolicies = await response.json();
const policies = allPolicies.filter(policy => policy.blocked !== true);
policies.forEach(function (policy) {
  // Show the policy card and the link.
});`,
        input: "Open navbar Policies as HR or employee",
        result: "Read-only policy cards",
        why: "Both roles can read this screen; only the HR sidebar leads to editing.",
        state: { screen: "Employee policy view", session: "HR or EMP stays signed in", browser: "Policies rendered", api: "GET /policies" }
      }
    ]
  },
  {
    id: "hr-feedback",
    group: "HR",
    title: "Feedback inbox",
    description: "HR loads submitted feedback, filters it, marks it reviewed, and sets priority.",
    caveat: "Category filter options are added by JavaScript after the page loads. The HTML only has “All categories”.",
    steps: [
      {
        title: "Load submissions",
        kind: "GET",
        source: "hr/feedback/feedback.js",
        code: `const response = await fetch(\`\${API}/feedback?_sort=createdAt&_order=desc\`);
feedbackItems = await response.json();
fillCategories();
showFeedback();`,
        input: "Open HR Feedback Inbox",
        result: "Cards and summary numbers appear",
        why: "HR reads the same /feedback collection written by the contact page.",
        state: { screen: "Feedback Inbox", session: "HR identity shown", browser: "Feedback array in page memory", api: "GET /feedback" }
      },
      {
        title: "Build category menu",
        kind: "UI",
        source: "hr/feedback/feedback.js",
        code: `const categories = ["General Feedback", "Feature Request", "HR Support", "Report Policy Issue"];
categoryFilter.innerHTML = '<option value="">All categories</option>';
categories.forEach(function (name) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  categoryFilter.appendChild(option);
});`,
        input: "Loaded feedback",
        result: "Dropdown includes the contact-form categories",
        why: "The HTML has only “All categories”; JavaScript adds one option for each category after loading data.",
        state: { screen: "Category dropdown filled", session: "HR identity unchanged", browser: "Filter operates on loaded array", api: "No write" }
      },
      {
        title: "Review or prioritize",
        kind: "PATCH",
        source: "hr/feedback/feedback.js",
        code: `const response = await fetch(\`\${API}/feedback/\${encodeURIComponent(id)}\`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(changes)
});`,
        input: "Mark reviewed or choose priority",
        result: "Feedback record updated for later visits",
        why: "Unlike localStorage-only data, this change persists in api/db.json.",
        state: { screen: "Updated feedback card", session: "HR identity unchanged", browser: "Array updated after response", api: "PATCH /feedback/:id" }
      }
    ]
  },
  {
    id: "hr-workspace",
    group: "HR",
    title: "HR workspace and operations",
    description: "HR sees live employee counts and can act on shared tasks and leave requests.",
    caveat: "The demo API is local to the host running json-server; it has no production authentication or atomic multi-record transactions.",
    steps: [
      {
        title: "Show HR identity",
        kind: "localStorage",
        source: "hr/workspace/workspace.js",
        code: `user = JSON.parse(localStorage.getItem("loggedUser"));
if (user !== null && user.name) {
  firstName = user.name.trim().split(/\\s+/)[0] || "there";
}`,
        input: "Open HR workspace",
        result: "Personalized greeting",
        why: "Only the small identity is read locally.",
        state: { screen: "HR workspace", session: "HR identity in loggedUser", browser: "loggedUser identity only", api: "No write" }
      },
      {
        title: "Load live company counts",
        kind: "GET",
        source: "hr/workspace/workspace.js",
        code: `const response = await fetch(\`\${API}/employees\`);
const employees = await response.json();
const active = employees.filter(person => person.status === "Active").length;
document.getElementById("hrActiveEmployees").textContent = active;`,
        input: "Workspace initializes",
        result: "Total, active, first-time, blocked counts",
        why: "Numbers derive from the current employee database.",
        state: { screen: "HR summary cards", session: "HR identity in loggedUser", browser: "Counts in DOM", api: "GET /employees" }
      },
      {
        title: "Manage team work",
        kind: "POST / PATCH",
        source: "hr/tasks/tasks.js",
        code: `// Sends one request. Gives back "" when it worked, or a short error text when it did not.
async function sendRequest(url, method, body) {
  const options = { method: method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  ...
}

const problem = await sendRequest(\`\${API}/tasks\`, "POST", task);`,
        input: "Open HR Tasks and assign work",
        result: "New task appears for the chosen employee",
        why: "The employee task board reads the same /tasks collection.",
        state: { screen: "HR Team Tasks", session: "HR identity in loggedUser", browser: "Task list in page memory", api: "POST /tasks" }
      },
      {
        title: "Review leave requests",
        kind: "PATCH",
        source: "hr/requests/requests.js",
        code: `const changes = { status: status, reviewer: session.name };
const response = await fetch(\`\${API}/leaveRequests/\${request.id}\`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(changes)
});`,
        input: "Open HR Leave Requests and decide",
        result: "Approved or rejected status persists",
        why: "The employee leave page sees the updated decision on reload.",
        state: { screen: "HR Leave Requests", session: "HR identity in loggedUser", browser: "No local leave store", api: "PATCH /leaveRequests/:id" }
      }
    ]
  },
  {
    id: "logout",
    group: "IDENTITY",
    title: "Log out and return",
    description: "The shared navbar clears the local identity and opens Login.",
    caveat: "Logging out clears the identity key, but other browser-local data such as the theme setting may remain in this browser.",
    steps: [
      {
        title: "Click Logout",
        kind: "Input",
        source: "shared/navbar-hr.html",
        code: `<a class="navbar-logout" href="../../common/login/login.html" title="Logout" aria-label="Logout" hidden>
  <span class="navbar-logout-text">Logout</span>
</a>`,
        input: "Logout action in shared navbar",
        result: "Navigation to Login begins",
        why: "Employee and HR navbar templates both lead to the shared Login page.",
        state: { screen: "Leaving current screen", session: "Still present briefly", browser: "Navigation started", api: "No request" }
      },
      {
        title: "Remove identity key",
        kind: "localStorage",
        source: "shared/navbar.js",
        code: `logoutLink.addEventListener("click", function () {
  localStorage.removeItem("loggedUser");
});`,
        input: "Logout click event",
        result: "Session key removed",
        why: "The next protected page sees no user and redirects to Login.",
        state: { screen: "Login", session: "No loggedUser", browser: "Theme setting may remain", api: "Employee data unchanged" }
      },
      {
        title: "Login page clears old session too",
        kind: "localStorage",
        source: "common/login/login.js",
        code: `// Opening the login page ends the old session (this is what Logout does too).
localStorage.removeItem("loggedUser");`,
        input: "Login page loads",
        result: "Clean login state",
        why: "Opening Login itself ends any leftover local session.",
        state: { screen: "Login form", session: "Cleared", browser: "Unrelated local app data may remain", api: "No database change" }
      }
    ]
  }
];

// ── The page ─────────────────────────────────────────────────────────────────

const nav = document.getElementById("flowNav");
const track = document.getElementById("stepTrack");
const stateCards = document.getElementById("stateCards");
let currentFlow = 0;
let currentStep = 0;

// Stops text from being read as HTML before it goes inside a backtick template.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chooseFlow(index) {
  currentFlow = index;
  currentStep = 0;
  showGuide();
  history.replaceState(null, "", `#${flows[index].id}`);
}

function chooseStep(index) {
  currentStep = index;
  showGuide();
}

// The list of flows on the left. A small title shows when the group changes.
function showNav() {
  nav.innerHTML = "";
  let previousGroup = "";
  flows.forEach(function (flow, index) {
    if (flow.group !== previousGroup) {
      const label = document.createElement("div");
      label.className = "nav-group";
      label.textContent = flow.group;
      nav.appendChild(label);
      previousGroup = flow.group;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "flow-choice";
    button.setAttribute("aria-current", String(index === currentFlow));
    button.innerHTML = `<span class="nav-number">${String(index + 1).padStart(2, "0")}</span>${escapeHtml(flow.title)}`;
    button.onclick = function () {
      chooseFlow(index);
    };
    nav.appendChild(button);
  });
}

// The steps of the chosen flow. The step you are on is "is-active", the steps before it are "is-done".
function showTrack(flow) {
  track.innerHTML = "";
  flow.steps.forEach(function (step, index) {
    let stateClass = "";
    if (index === currentStep) {
      stateClass = "is-active";
    } else if (index < currentStep) {
      stateClass = "is-done";
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = `step-button ${stateClass}`;
    button.setAttribute("aria-current", String(index === currentStep));
    button.innerHTML = `<span class="step-index">STEP ${String(index + 1).padStart(2, "0")}</span>${escapeHtml(step.title)}`;
    button.onclick = function () {
      chooseStep(index);
    };
    track.appendChild(button);
  });
}

// The four cards "What changes?". The card that changes in this step is highlighted.
function showState(step) {
  const labels = [
    ["screen", "Screen / route"],
    ["session", "Local identity"],
    ["browser", "Browser storage / memory"],
    ["api", "API / JSON file"]
  ];

  let active = "screen";
  if (["GET", "POST", "PATCH", "PUT", "POST / PATCH"].includes(step.kind)) {
    active = "api";
  } else if (step.kind.includes("localStorage")) {
    active = "browser";
  }

  stateCards.innerHTML = "";
  labels.forEach(function (item) {
    const key = item[0];
    const card = document.createElement("div");
    card.className = key === active ? "state-card is-highlighted" : "state-card";
    card.innerHTML = `<div class="state-name">${item[1]}<span class="state-chip">${key === active ? "CHANGES HERE" : ""}</span></div><div class="state-value">${escapeHtml(step.state[key])}</div>`;
    stateCards.appendChild(card);
  });
}

// Shows the chosen flow and the chosen step.
function showGuide() {
  const flow = flows[currentFlow];
  const step = flow.steps[currentStep];
  showNav();
  showTrack(flow);
  document.getElementById("flowGroup").textContent = flow.group;
  document.getElementById("flowTitle").textContent = flow.title;
  document.getElementById("flowDescription").textContent = flow.description;
  document.getElementById("flowCount").textContent = `${flow.steps.length} steps`;
  document.getElementById("stepBadge").textContent = step.kind;
  document.getElementById("stepTitle").textContent = step.title;
  document.getElementById("stepDescription").textContent = step.why;
  document.getElementById("stepInput").textContent = step.input;
  document.getElementById("stepResult").textContent = step.result;
  document.getElementById("sourcePath").textContent = step.source;
  document.getElementById("sourceLink").href = `../${step.source}`;
  document.getElementById("codeSnippet").textContent = step.code;
  document.getElementById("stepWhy").textContent = step.why;
  document.getElementById("flowCaveat").textContent = flow.caveat;
  document.getElementById("playerPosition").textContent = `${currentStep + 1} / ${flow.steps.length}`;
  document.getElementById("previousStep").disabled = currentStep === 0;
  document.getElementById("nextStep").disabled = currentStep === flow.steps.length - 1;
  showState(step);
}

document.getElementById("previousStep").onclick = function () {
  chooseStep(Math.max(0, currentStep - 1));
};
document.getElementById("nextStep").onclick = function () {
  chooseStep(Math.min(flows[currentFlow].steps.length - 1, currentStep + 1));
};
document.getElementById("restartFlow").onclick = function () {
  chooseStep(0);
};

// The arrow keys go to the next or the previous step (not while typing or on a button).
document.addEventListener("keydown", function (event) {
  const tag = event.target.tagName;
  if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return;
  }
  if (event.key === "ArrowRight") {
    document.getElementById("nextStep").click();
  }
  if (event.key === "ArrowLeft") {
    document.getElementById("previousStep").click();
  }
});

// A link like index.html#hr-feedback opens that flow.
const hashIndex = flows.findIndex(flow => `#${flow.id}` === location.hash);
if (hashIndex >= 0) {
  currentFlow = hashIndex;
}
showGuide();
