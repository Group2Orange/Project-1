document.addEventListener("DOMContentLoaded",()=>{


// ===============================
// Load Logged User
// ===============================


const userData = localStorage.getItem("loggedUser");


const nameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");


if(userData){

    const user = JSON.parse(userData);

    nameInput.value = user.name;
    emailInput.value = user.email;

}
else{

    nameInput.value="Guest User";
    emailInput.value="";

}



// ===============================
// Feedback Categories
// ===============================


const categoryButtons =
document.querySelectorAll(".tags button");


let selectedCategory="General Feedback";


categoryButtons.forEach(btn=>{


btn.addEventListener("click",()=>{


categoryButtons.forEach(b=>{
b.classList.remove("selected");
});


btn.classList.add("selected");


selectedCategory = btn.innerText;


});


});



// ===============================
// File Upload
// ===============================


let uploadedFile="";


const uploadBox=document.querySelector(".upload");


const fileInput=document.createElement("input");

fileInput.type="file";
fileInput.accept=".png,.jpg,.jpeg,.pdf,.docx";
fileInput.hidden=true;


uploadBox.appendChild(fileInput);



uploadBox.addEventListener("click",()=>{

fileInput.click();

});



fileInput.addEventListener("change",()=>{


const file=fileInput.files[0];


if(file){


if(file.size > 10*1024*1024){

alert("File size must be less than 10MB");
return;

}


uploadedFile=file.name;


uploadBox.querySelector("p").innerText=file.name;


}


});




// ===============================
// Submit Feedback
// ===============================


const sendBtn=document.querySelector(".submit");


sendBtn.addEventListener("click",()=>{


const subject =
document.querySelector("input[placeholder*='hybrid']").value;



const message =
document.querySelector("textarea").value;



const anonymous =
document.getElementById("anonymous").checked;



if(subject.trim()=="" || message.trim()==""){


alert("Please fill subject and message");
return;

}




let user = JSON.parse(
localStorage.getItem("loggedUser")
);



let feedback={


id:Date.now(),



name:
anonymous ? "Anonymous" : user.name,


email:
anonymous ? "Hidden" : user.email,



category:selectedCategory,



subject:subject,



message:message,



attachment:uploadedFile || null,



date:new Date().toLocaleString(),



status:"New"


};




// ===============================
// Save Feedback
// ===============================


let feedbacks =
JSON.parse(localStorage.getItem("feedbacks")) || [];



feedbacks.push(feedback);



localStorage.setItem(
"feedbacks",
JSON.stringify(feedbacks)
);



alert("Feedback sent successfully!");



// clear form

document.querySelector("textarea").value="";
document.querySelector("input[placeholder*='hybrid']").value="";


});


});