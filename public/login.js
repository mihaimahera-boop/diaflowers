const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const ADMIN_EMAIL = "admin@diaflowers.ro";
const ADMIN_PASSWORD = "DiaFlowers2026!";

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    localStorage.setItem("diaflowersAdmin", "true");
    window.location.href = "admin.html";
  } else {
    loginError.textContent = "Email sau parolă greșită.";
  }
});