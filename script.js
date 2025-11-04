import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🧑 Username setup
let username = localStorage.getItem("username");
if (!username) {
  username = prompt("अपना नाम डालो 👇") || "User";
  localStorage.setItem("username", username);
}

// 🟢 Online / Offline status
const statusRef = ref(db, "status/" + username);
set(statusRef, "Online");
window.addEventListener("beforeunload", () => set(statusRef, "Offline"));

const statusDisplay = document.getElementById("status");
onValue(statusRef, (snapshot) => {
  const state = snapshot.val();
  statusDisplay.textContent = state === "Online" ? "Online" : "Offline";
  statusDisplay.style.color = state === "Online" ? "#25d366" : "gray";
});

// 💬 Typing indicator
const messageInput = document.getElementById("messageInput");
messageInput.addEventListener("input", () => {
  set(statusRef, "Typing...");
  setTimeout(() => set(statusRef, "Online"), 2000);
});

// 📸 Profile upload
const upload = document.getElementById("uploadPhoto");
const profileImg = document.getElementById("profileImg");
upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      profileImg.src = ev.target.result;
      localStorage.setItem("profilePhoto", ev.target.result);
    };
    reader.readAsDataURL(file);
  }
});

// Restore profile photo
const savedPhoto = localStorage.getItem("profilePhoto");
if (savedPhoto) profileImg.src = savedPhoto;

// 💬 Send and receive messages
const sendBtn = document.getElementById("sendBtn");
const messagesContainer = document.getElementById("messages");

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;

  const msgRef = ref(db, "messages");
  push(msgRef, {
    name: username,
    text: msg,
    time: new Date().toLocaleTimeString(),
  });

  messageInput.value = "";
}

const msgRef = ref(db, "messages");
onChildAdded(msgRef, (snapshot) => {
  const data = snapshot.val();
  showMessage(data.name, data.text, data.time);
});

function showMessage(name, text, time) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.classList.add(name === username ? "sent" : "received");
  msgDiv.innerHTML = `<b>${name}</b><br>${text}<small>${time}</small>`;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
