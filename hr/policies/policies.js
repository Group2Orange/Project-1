let container = document.getElementById("policiesContainer");
let links = document.getElementById("policyLinks");

let editBtn = document.getElementById("editBtn");
let saveBtn = document.getElementById("saveBtn");
let cancelBtn = document.getElementById("cancelBtn");

let policies = [];


// جلب السياسات
async function loadPolicies() {

    let saved = localStorage.getItem("teamspacePolicies");

    if (saved) {
        policies = JSON.parse(saved);
    }

    else {
        let response = await fetch("../../Data/file.json");
        let data = await response.json();

        policies = data.policies;
    }

    showPolicies();
}


// عرض السياسات
function showPolicies() {

    container.innerHTML = "";
    links.innerHTML = "";

    for (let i = 0; i < policies.length; i++) {

        let p = policies[i];

        container.innerHTML += `
            <div class="policy"
                 id="policy-${p.id}"
                 data-id="${p.id}">

                <p class="category editable">
                    ${p.category}
                </p>

                <h3 class="title editable">
                    ${p.id}. ${p.title}
                </h3>

                <p class="description editable">
                    ${p.description}
                </p>

            </div>
        `;


        links.innerHTML += `
            <a href="#policy-${p.id}" class="policy-link">
                <span>${p.id}</span>
                ${p.title}
            </a>
        `;
    }
}


// Edit
editBtn.onclick = function () {

    let items = document.querySelectorAll(".editable");

    for (let i = 0; i < items.length; i++) {

        items[i].contentEditable = true;
        items[i].classList.add("editing");
    }

    editBtn.classList.add("hidden");
    saveBtn.classList.remove("hidden");
    cancelBtn.classList.remove("hidden");
};


// Save
saveBtn.onclick = function () {

    let cards = document.querySelectorAll(".policy");

    policies = [];


    for (let i = 0; i < cards.length; i++) {

        let card = cards[i];

        let title = card.querySelector(".title").innerText;

        title = title.replace(/^\d+\.\s*/, "");


        policies.push({

            id: Number(card.dataset.id),

            title: title,

            category: card.querySelector(".category").innerText,

            description: card.querySelector(".description").innerText
        });
    }


    localStorage.setItem(
        "teamspacePolicies",
        JSON.stringify(policies)
    );


    showPolicies();

    editBtn.classList.remove("hidden");
    saveBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");

    alert("Policies updated successfully");
};


// Cancel
cancelBtn.onclick = function () {

    showPolicies();

    editBtn.classList.remove("hidden");
    saveBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");
};


// تشغيل
loadPolicies();