// HR workspace: a greeting, today's date and a summary of the employees.
const API = "http://127.0.0.1:3000";

// ----- Greeting and date -----
let user = null;
try {
  user = JSON.parse(localStorage.getItem("loggedUser"));
} catch (error) {
  user = null;
}

let firstName = "there";
if (user !== null && user.name) {
  firstName = user.name.trim().split(/\s+/)[0] || "there";
}

const now = new Date();
let greeting = "Good evening";
if (now.getHours() < 12) {
  greeting = "Good morning";
} else if (now.getHours() < 18) {
  greeting = "Good afternoon";
}

document.getElementById("hrGreeting").textContent = `${greeting}, ${firstName} 👋`;
const today = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
document.getElementById("hrWorkspaceDate").textContent = `Your HR workspace for ${today}.`;

// ----- Summary of the employees (the data comes from the API) -----
async function loadTeamSummary() {
  const message = document.getElementById("hrWorkspaceMessage");
  try {
    const response = await fetch(`${API}/employees`);
    if (!response.ok) {
      message.textContent = "Could not load team summary. Start the API with npm run api.";
      return;
    }
    const employees = await response.json();

    // filter() keeps the employees that match, and .length counts them.
    const active = employees.filter(person => person.status === "Active").length;
    const blocked = employees.filter(person => person.status === "Blocked").length;
    const firstAttend = employees.filter(person => person.firstAttend === true).length;

    document.getElementById("hrTotalEmployees").textContent = employees.length;
    document.getElementById("hrActiveEmployees").textContent = active;
    document.getElementById("hrFirstAttend").textContent = firstAttend;
    document.getElementById("hrBlockedEmployees").textContent = blocked;
  } catch (error) {
    message.textContent = `${error.message} Start the API with npm run api.`;
  }
}

loadTeamSummary();
