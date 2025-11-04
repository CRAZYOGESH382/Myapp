// Firebase config
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const loginDiv = document.getElementById("loginDiv");
const chatDiv = document.getElementById("chatDiv");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const messageBox = document.getElementById("messages");
let userName = "";

// Login / Signup
loginBtn.addEventListener("click", async () => {
  const name = document.getElementById("nameInput").value;
  const email = document.getElementById("emailInput").value;
  const password = document.getElementById("passwordInput").value;

  if (!email || !password || !name) {
    alert("कृपया सभी फील्ड भरें!");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });
    userName = name;
  } catch (error) {
    // अगर यूज़र पहले से है तो login करो
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      userName = userCredential.user.displayName || name;
    } catch (err) {
      alert("Login Error: " + err.message);
      return;
    }
  }

  loginDiv.classList.add("hidden");
  chatDiv.classList.remove("hidden");
});

// Send message
sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message === "") return;

  const timestamp = new Date().toLocaleTimeString();
  db.ref("messages").push({
    name: userName,
    text: message,
    time: timestamp
  });
  messageInput.value = "";
});

// Show messages
db.ref("messages").on("child_added", (snapshot) => {
  const data = snapshot.val();
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.innerHTML = `<b>${data.name}</b>: ${data.text} <span>${data.time}</span>`;
  messageBox.appendChild(msgDiv);
  messageBox.scrollTop = messageBox.scrollHeight;
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut();
  chatDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
});
