// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ✅ Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDS0qwZFuNE3fR7dDpTz_Sr7NrtqEgAorU",
  authDomain: "privetchatapp.firebaseapp.com",
  databaseURL: "https://privetchatapp-default-rtdb.firebaseio.com",
  projectId: "privetchatapp",
  storageBucket: "privetchatapp.firebasestorage.app",
  messagingSenderId: "590135835173",
  appId: "1:590135835173:web:70d46a34d53af9b2f59dcc",
  measurementId: "G-J9SMFCJTCR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------------------------
// 👤 Get username (temporary)
let username = localStorage.getItem("username");
if (!username) {
  username = prompt("अपना नाम डालो 👇");
  localStorage.setItem("username", username || "User");
}

// ---------------------------
// 🎯 Send message
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesContainer = document.getElementById("messages");

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (msg === "") return;

  const msgRef = ref(db, "messages");
  push(msgRef, {
    name: username,
    text: msg,
    time: new Date().toLocaleTimeString(),
  });

  messageInput.value = "";
}

// ---------------------------
// 📡 Receive message live
const msgRef = ref(db, "messages");
onChildAdded(msgRef, (snapshot) => {
  const data = snapshot.val();
  displayMessage(data.name, data.text, data.time);
});

// ---------------------------
// 💬 Display message in UI
function displayMessage(name, text, time) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.classList.add(name === username ? "sent" : "received");
  msgDiv.innerHTML = `<b>${name}</b>: ${text} <small>${time}</small>`;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ---------------------------
// 🟢 Optional Logout Feature
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("username");
    location.reload();
  });
}
