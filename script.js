import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { 
  getDatabase, ref, push, set, onChildAdded 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDS0qwZFuNE3fR7dDpTz_Sr7NrtqEgAorU",
  authDomain: "privetchatapp.firebaseapp.com",
  databaseURL: "https://privetchatapp-default-rtdb.firebaseio.com",
  projectId: "privetchatapp",
  appId: "1:590135835173:web:70d46a34d53af9b2f59dcc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Elements
const authBox = document.getElementById("authBox");
const chatContainer = document.getElementById("chatContainer");
const email = document.getElementById("email");
const password = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const imageInput = document.getElementById("imageInput");
const statusText = document.getElementById("statusText");

let currentUser = null;

// Sign Up
signupBtn.onclick = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert("Signup Successful ✅"))
    .catch(e => alert(e.message));
};

// Login
loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert("Login Successful ✅"))
    .catch(e => alert(e.message));
};

// Logout
logoutBtn.onclick = () => {
  signOut(auth);
};

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authBox.style.display = "none";
    chatContainer.style.display = "block";
    statusText.innerText = "Status: 🟢 Online";
    loadMessages();
  } else {
    currentUser = null;
    authBox.style.display = "block";
    chatContainer.style.display = "none";
  }
});

// Send Message / Image
sendBtn.onclick = () => {
  const msg = messageInput.value.trim();
  const img = imageInput.files[0];
  if (!msg && !img) return;

  const msgRef = ref(db, "messages");
  const newMsg = push(msgRef);

  if (img) {
    const reader = new FileReader();
    reader.onload = (e) => {
      set(newMsg, {
        name: currentUser.email.split("@")[0],
        image: e.target.result,
        time: new Date().toLocaleTimeString()
      });
    };
    reader.readAsDataURL(img);
  } else {
    set(newMsg, {
      name: currentUser.email.split("@")[0],
      text: msg,
      time: new Date().toLocaleTimeString()
    });
  }

  messageInput.value = "";
  imageInput.value = "";
};

// Load Messages
function loadMessages() {
  const msgRef = ref(db, "messages");
  onChildAdded(msgRef, (snapshot) => {
    const data = snapshot.val();
    const div = document.createElement("div");
    div.classList.add("message");
    div.classList.add(data.name === currentUser.email.split("@")[0] ? "sent" : "received");
    div.innerHTML = `<b>${data.name}</b><br>`;
    if (data.text) div.innerHTML += data.text;
    if (data.image) div.innerHTML += `<br><img src="${data.image}" class="chat-img">`;
    div.innerHTML += `<br><small>${data.time}</small>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}
