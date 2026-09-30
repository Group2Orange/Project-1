const cards = document.querySelectorAll(".team-card");

const modal = document.getElementById("memberModal");
const closeModal = document.getElementById("closeModal");

const modalName = document.getElementById("modalName");
const modalRole = document.getElementById("modalRole");
const modalDescription = document.getElementById("modalDescription");
const modalSkills = document.getElementById("modalSkills");
const modalGithub = document.getElementById("modalGithub");


// =========================
// OPEN MEMBER DETAILS
// =========================

cards.forEach(function(card) {

    card.addEventListener("click", function() {

        const name = card.dataset.name;

        const role = card.dataset.role;

        const description =
            card.dataset.description;

      const github = card.dataset.github;


        const skills =
            card.dataset.skills.split(",");


        modalName.textContent = name;

        modalRole.textContent = role;

        modalDescription.textContent =
            description;

        
        modalGithub.href = github;


        // Clear old skills
        modalSkills.innerHTML = "";


        // Create skill elements
        skills.forEach(function(skill) {

            const skillElement =
                document.createElement("span");

            skillElement.classList.add("skill");

            skillElement.textContent =
                skill.trim();

            modalSkills.appendChild(
                skillElement
            );

        });


        // Open modal
        modal.classList.add("active");

    });

});


// =========================
// CLOSE BUTTON
// =========================

closeModal.addEventListener("click", function() {

    modal.classList.remove("active");

});


// =========================
// CLICK OUTSIDE MODAL
// =========================

modal.addEventListener("click", function(event) {

    if (event.target === modal) {

        modal.classList.remove("active");

    }

});


// =========================
// SOCIAL LINKS
// =========================

const socialLinks =
    document.querySelectorAll(".socials a");


socialLinks.forEach(function(link) {

    link.addEventListener("click", function(event) {

        event.stopPropagation();

    });

});