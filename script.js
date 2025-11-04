// ✅ Firebase App Configuration (browser-compatible)
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

// 🔗 Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Elements
const loginBox = document.getElementById("loginBox");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("messageInput");

// 🔐 Login or Signup Function
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => loadChat())
    .catch(() => {
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(() => loadChat());
    });
}

// 📤 Send Message
function sendMessage() {
  const message = msgInput.value.trim();
  if (message === "") return;

  const user = firebase.auth().currentUser;
  const timestamp = new Date().toLocaleTimeString();

  firebase.database().ref("messages").push({
    user: user.email,
    text: message,
    time: timestamp
  });

  msgInput.value = "";
}

// 📥 Real-time Message Listener
firebase.database().ref("messages").on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const msgDiv = document.createElement("div");
  msgDiv.innerHTML = `<b>${msg.user}</b>: ${msg.text} <small>(${msg.time})</small>`;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// 🚪 Logout
function logout() {
  firebase.auth().signOut().then(() => {
    chatBox.style.display = "none";
    loginBox.style.display = "block";
  });
}

// ✅ After Login
function loadChat() {
  loginBox.style.display = "none";
  chatBox.style.display = "block";
}
