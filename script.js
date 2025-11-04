// script.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getDatabase, ref, set, push, onChildAdded, onValue, serverTimestamp, onDisconnect, remove, update
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

// ------------------- Firebase config -------------------
const firebaseConfig = {
  apiKey: "AIzaSyDS0qwZFuNE3fR7dDpTz_Sr7NrtqEgAorU",
  authDomain: "privetchatapp.firebaseapp.com",
  databaseURL: "https://privetchatapp-default-rtdb.firebaseio.com",
  projectId: "privetchatapp",
  appId: "1:590135835173:web:70d46a34d53af9b2f59dcc",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ------------------- UI Elements -------------------
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileSection = document.getElementById("profile");
const profilePic = document.getElementById("profilePic");
const displayNameEl = document.getElementById("displayName");
const profileImageInput = document.getElementById("profileImageInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const contactsDiv = document.getElementById("contacts");

const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const attachFile = document.getElementById("attachFile");
const voiceBtn = document.getElementById("voiceBtn");
const typingIndicator = document.getElementById("typingIndicator");
const chatWith = document.getElementById("chatWith");
const statusLine = document.getElementById("statusLine");
const notifySound = document.getElementById("notifySound");
const themeBtn = document.getElementById("themeBtn");

let currentUser = null;
let currentChatRoom = null; // roomId string
let contactsList = []; // cached users

// ------------------- Auth Handlers -------------------
signupBtn.onclick = async () => {
  const email = emailEl.value.trim(), pass = passEl.value.trim();
  if (!email || !pass) return alert("Email & password needed");
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    // create user record
    await set(ref(db, `users/${res.user.uid}`), {
      name: email.split("@")[0],
      email: email,
      createdAt: Date.now()
    });
  } catch (e) { alert(e.message); }
};

loginBtn.onclick = async () => {
  const email = emailEl.value.trim(), pass = passEl.value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) { alert(e.message); }
};

logoutBtn.onclick = () => signOut(auth);

// ------------------- Presence & onAuth -------------------
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-section").style.display = "none";
    logoutBtn.style.display = "inline-block";
    profileSection.style.display = "block";
    loadProfile();
    startPresence();
    loadContacts();
  } else {
    currentUser = null;
    document.getElementById("auth-section").style.display = "block";
    logoutBtn.style.display = "none";
    profileSection.style.display = "none";
    messagesEl.innerHTML = "";
    contactsDiv.innerHTML = "";
    chatWith.innerText = "Select contact to chat";
  }
});

// ------------------- Profile Save -------------------
saveProfileBtn.onclick = async () => {
  if (!currentUser) return;
  const name = displayNameEl.value.trim() || currentUser.email.split("@")[0];
  let base64 = null;
  const f = profileImageInput.files[0];
  if (f) {
    base64 = await fileToBase64(f);
  } else {
    base64 = profilePic.src || null;
  }
  await update(ref(db, `users/${currentUser.uid}`), { name, photo: base64 });
  alert("Profile saved");
  loadContacts();
};

async function loadProfile() {
  const snap = await (await fetch).catch(()=>null); // just to avoid lint
  const uRef = ref(db, `users/${currentUser.uid}`);
  onValue(uRef, s=>{
    const data = s.val() || {};
    profilePic.src = data.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name||currentUser.email.split("@")[0])}&background=0D8ABC&color=fff`;
    displayNameEl.value = data.name || currentUser.email.split("@")[0];
  });
}

// ------------------- Contacts (other users) -------------------
function loadContacts() {
  contactsDiv.innerHTML = "<small>Loading contacts...</small>";
  const usersRef = ref(db, "users");
  onValue(usersRef, snap=>{
    const data = snap.val() || {};
    contactsDiv.innerHTML = "";
    contactsList = [];
    Object.keys(data).forEach(uid=>{
      if (uid === currentUser.uid) return;
      const u = { uid, ...data[uid] };
      contactsList.push(u);
      const div = document.createElement("div");
      div.className = "contact";
      div.innerHTML = `<img src="${u.photo||`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=ccc&color=000`}" />
        <div><div class="cname">${u.name||u.email}</div><div class="clast">${u.email||''}</div></div>`;
      div.onclick = ()=> openChatWith(u);
      contactsDiv.appendChild(div);
    });
  });
}

// ------------------- Chat Room utils -------------------
function makeRoomId(a,b){
  return a<b ? `${a}_${b}` : `${b}_${a}`;
}

function openChatWith(userObj){
  currentChatRoom = makeRoomId(currentUser.uid, userObj.uid);
  chatWith.innerText = `Chat with ${userObj.name||userObj.email}`;
  messagesEl.innerHTML = "";
  statusLine.innerText = "";
  loadMessages(currentChatRoom);
  watchTyping(currentChatRoom, userObj.uid);
}

// ------------------- Messages -------------------
function loadMessages(roomId){
  const roomRef = ref(db, `chats/${roomId}/messages`);
  messagesEl.innerHTML = "";
  onChildAdded(roomRef, snap=>{
    const msg = snap.val();
    appendMessage(msg, snap.key);
    if (msg.senderUid !== currentUser.uid) notifySound.play();
  });
}

function appendMessage(msg, key){
  const div = document.createElement("div");
  div.className = "msg " + (msg.senderUid===currentUser.uid ? "sent":"recv");
  let inner = `<strong>${msg.senderName||msg.senderEmail||'User'}</strong><br/>`;
  if (msg.text) inner += `${escapeHtml(msg.text)}<br/>`;
  if (msg.image) inner += `<img src="${msg.image}" style="max-width:200px;border-radius:8px;margin-top:6px;display:block"/>`;
  if (msg.file) inner += `<a href="${msg.file}" target="_blank">Download file</a><br/>`;
  inner += `<small>${new Date(msg.time||Date.now()).toLocaleTimeString()} ${msg.edited? '(edited)':''}</small>`;

  // owner controls
  if (msg.senderUid === currentUser.uid){
    inner += `<div style="margin-top:6px"><button data-action="delete" data-key="${key}">Delete</button>
              <button data-action="edit" data-key="${key}">Edit</button></div>`;
  }
  div.innerHTML = inner;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // attach events for delete/edit
  div.querySelectorAll("button").forEach(b=>{
    const action = b.dataset.action;
    const key = b.dataset.key;
    if (action==="delete") b.onclick = ()=> deleteMessage(currentChatRoom, key);
    if (action==="edit") b.onclick = ()=> editMessagePrompt(currentChatRoom, key);
  });
}

async function sendMessage({text=null,image=null,file=null}){
  if (!currentChatRoom) return alert("Select contact first");
  const messagesRef = ref(db, `chats/${currentChatRoom}/messages`);
  const newRef = push(messagesRef);
  const userRecordSnap = await (await fetch).catch(()=>null);
  const nameSnap = ref(db, `users/${currentUser.uid}`);
  // read name quickly (onValue used earlier so should be present)
  onValue(nameSnap, snap=>{
    const user = snap.val() || {};
    set(newRef, {
      senderUid: currentUser.uid,
      senderName: user.name || currentUser.email.split("@")[0],
      senderEmail: currentUser.email,
      text: text || null,
      image: image || null,
      file: file || null,
      time: Date.now(),
      edited: false
    });
  }, {onlyOnce:true});
}

sendBtn.onclick = async ()=>{
  const text = msgInput.value.trim();
  if (!text && !attachFile.files[0]) return;
  if (attachFile.files[0]){
    const f = attachFile.files[0];
    if (f.type.startsWith("image/")){
      const b = await fileToBase64(f);
      await sendMessage({image:b});
    } else {
      // other file: save base64 and provide link via data URL
      const b = await fileToBase64(f);
      await sendMessage({file:b});
    }
    attachFile.value = "";
  } else {
    await sendMessage({text});
  }
  msgInput.value = "";
  setTyping(false);
};

// ------------------- Delete/Edit -------------------
function deleteMessage(roomId, key){
  if (!confirm("Delete message?")) return;
  remove(ref(db, `chats/${roomId}/messages/${key}`));
}

async function editMessagePrompt(roomId,key){
  const snap = await getOnce(`chats/${roomId}/messages/${key}`);
  const text = snap && snap.text ? snap.text : "";
  const newText = prompt("Edit message", text);
  if (newText === null) return;
  update(ref(db, `chats/${roomId}/messages/${key}`), { text: newText, edited: true, time: Date.now() });
}

// helper to get value once
function getOnce(path){
  return new Promise((res,rej)=>{
    const r = ref(db, path);
    onValue(r, s=>{ res(s.val()); }, {onlyOnce:true});
  });
}

// ------------------- Typing Indicator -------------------
let typingTimeout = null;
msgInput.addEventListener("input", ()=> {
  setTyping(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(()=> setTyping(false), 1200);
});

function setTyping(flag){
  if (!currentChatRoom || !currentUser) return;
  set(ref(db, `typing/${currentChatRoom}/${currentUser.uid}`), flag ? true : null);
}

function watchTyping(roomId, otherUid){
  // reset
  typingIndicator.innerText = "";
  const tRef = ref(db, `typing/${roomId}`);
  onValue(tRef, snap=>{
    const val = snap.val() || {};
    const keys = Object.keys(val);
    const othersTyping = keys.filter(k=>k !== currentUser.uid);
    typingIndicator.innerText = othersTyping.length ? "Typing..." : "";
  });
}

// ------------------- Presence (online/offline) -------------------
function startPresence(){
  const pRef = ref(db, `presence/${currentUser.uid}`);
  set(pRef, { online: true, lastSeen: Date.now() });
  onDisconnect(pRef).set({ online:false, lastSeen: Date.now() });
}

// ------------------- Voice Recording -------------------
let mediaRecorder = null, audioChunks = [];
voiceBtn.onclick = async ()=>{
  if (!mediaRecorder){
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async ()=>{
      const blob = new Blob(audioChunks, {type:'audio/webm'});
      audioChunks = [];
      const base64 = await blobToBase64(blob);
      await sendMessage({file: base64});
    };
    mediaRecorder.start();
    voiceBtn.innerText = "Stop";
  } else {
    mediaRecorder.stop();
    mediaRecorder = null;
    voiceBtn.innerText = "🎤";
  }
};

// ------------------- Helpers -------------------
function fileToBase64(file){
  return new Promise((res,rej)=>{
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = e => rej(e);
    reader.readAsDataURL(file);
  });
}
function blobToBase64(blob){
  return new Promise(r=>{
    const reader = new FileReader();
    reader.onload = e => r(e.target.result);
    reader.readAsDataURL(blob);
  });
}
function escapeHtml(str){
  return (str||"").replace(/[&<>"']/g, s=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s]));
}

// ------------------- small util for onValue once in old style -------------------
function onValueOnce(refPath){ return new Promise(res=>{ onValue(ref(db, refPath), s=>res(s.val()), {onlyOnce:true}); }); }

// ------------------- small helper used above (get once) fallback to onValue) ---------------
function onValue(refObj, cb, opts){ // wrapper to accept path string used earlier
  // note: we imported onValue from firebase; using it directly:
  return import("https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js").then(mod=>{
    return mod.onValue(typeof refObj === "string" ? ref(db, refObj) : refObj, cb, opts);
  });
}

// ------------------- Simple notifications when new contact logs online -------------------
// theme toggle (simple)
themeBtn.onclick = ()=> {
  document.body.classList.toggle("dark");
  if (document.body.classList.contains("dark")){
    document.documentElement.style.setProperty("--panel","#222");
    document.documentElement.style.setProperty("--bg1","#0f1724");
  } else {
    document.documentElement.style.removeProperty("--panel");
    document.documentElement.style.removeProperty("--bg1");
  }
};

// ------------------- Open chat with contact from outside (used earlier) -------------------
window.openChatWith = openChatWith;
