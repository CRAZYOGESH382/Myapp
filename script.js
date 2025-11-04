// script.js — Chat App Pro (many features)
// Imports (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase, ref, push, onChildAdded, set, onValue, remove, update
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getStorage, ref as sref, uploadString, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// ---------- CONFIG ----------
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
const auth = getAuth(app);
const storage = getStorage(app);

// ---------- UI Refs ----------
const myPhoto = document.getElementById('myPhoto');
const displayNameInput = document.getElementById('displayName');
const saveProfileBtn = document.getElementById('saveProfile');
const userListEl = document.getElementById('userList');
const messagesEl = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('btnSend') || document.getElementById('sendBtn');
const typingText = document.getElementById('typingText');
const chatNameEl = document.getElementById('chatName');
const chatStatusEl = document.getElementById('chatStatus');
const attachBtn = document.getElementById('btnAttach');
const attachFileInput = document.getElementById('attachFile') || document.getElementById('fileUpload');
const gifBtn = document.getElementById('btnGif');
const voiceBtn = document.getElementById('btnVoice');
const themeToggle = document.getElementById('themeToggle');
const clearBtn = document.getElementById('btnClear');
const exportBtn = document.getElementById('btnExport');

// ---------- Local user state ----------
let me = { uid: null, name: null, photo: null };
let currentChat = { id: 'global', name: 'Public Chat' };
chatNameEl.textContent = currentChat.name;
let typingTimeout = null;

// ---------- AUTH (anonymous) so each browser has uid ----------
signInAnonymously(auth).catch(e => console.warn('Auth failed', e));
onAuthStateChanged(auth, user => {
  if (!user) return;
  me.uid = user.uid;
  // load saved profile from localStorage
  me.name = localStorage.getItem('chat_name') || `User${me.uid.slice(0,5)}`;
  me.photo = localStorage.getItem('chat_photo') || myPhoto.src;
  displayNameInput.value = me.name;
  myPhoto.src = me.photo;
  set(`/users/${me.uid}`, { uid: me.uid, name: me.name, photo: me.photo });
  loadUsersList();
  initListeners();
});

// ---------- Save profile ----------
saveProfileBtn?.addEventListener('click', async () => {
  me.name = displayNameInput.value || me.name;
  localStorage.setItem('chat_name', me.name);
  set(`/users/${me.uid}`, { uid: me.uid, name: me.name, photo: me.photo });
  alert('Profile saved');
  loadUsersList();
});

// ---------- Users list (simple) ----------
async function loadUsersList(){
  userListEl.innerHTML = '';
  // fetch snapshot of /users
  onValue(ref(db,'users'), snapshot => {
    userListEl.innerHTML = '';
    const users = snapshot.val() || {};
    Object.values(users).forEach(u => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${u.name || u.uid}</span><small style="display:block;color:#666">${u.uid===me.uid?'You':u.uid.slice(0,6)}</small>`;
      li.addEventListener('click', () => openPrivateChat(u.uid, u.name, u.photo));
      userListEl.appendChild(li);
    });
  }, {onlyOnce:false});
}

// ---------- Open private chat (room id deterministic) ----------
function openPrivateChat(otherUid, otherName, otherPhoto){
  // room id consistent: smaller+_+bigger
  const members = [me.uid, otherUid].sort();
  currentChat.id = `dm_${members[0]}_${members[1]}`;
  currentChat.name = otherName || 'Chat';
  chatNameEl.textContent = currentChat.name;
  chatStatusEl.textContent = 'Online';
  messagesEl.innerHTML = '';
  listenMessages(currentChat.id);
}

// ---------- Listen public by default ----------
function initListeners(){
  listenMessages(currentChat.id);
  listenStatus();
}

// ---------- Message schema
// messages/{roomId}/{msgId} = {
//   fromUid, fromName, text, time, type:'text|image|file|voice', delivered:{uid:true}, seen:{uid:true}, replyTo: msgId, edited:bool
// }

// ---------- Send message ----------
sendBtn?.addEventListener('click', sendMessage);
msgInput?.addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });

function sendMessage(){
  const text = (msgInput.value||'').trim();
  if(!text) return;
  const msg = {
    fromUid: me.uid, fromName: me.name, text,
    time: new Date().toLocaleTimeString(),
    type: 'text', delivered:{}, seen:{}
  };
  push(ref(db, `messages/${currentChat.id}`), msg);
  msgInput.value = '';
  // update last message metadata
  set(ref(db, `rooms/${currentChat.id}/meta`), { lastText: text, lastTime: Date.now()});
  // send push via cloud function? (see server block below)
}

// ---------- Attach file (image/file) ----------
attachBtn?.addEventListener('click', ()=> attachFileInput?.click());
attachFileInput?.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    const base64 = ev.target.result;
    // upload to storage
    const path = `rooms/${currentChat.id}/${Date.now()}_${f.name}`;
    const storageRef = sref(storage, path);
    await uploadString(storageRef, base64, 'data_url');
    const url = await getDownloadURL(storageRef);
    push(ref(db, `messages/${currentChat.id}`), {
      fromUid: me.uid, fromName: me.name, text: url, time: new Date().toLocaleTimeString(),
      type: f.type.startsWith('image') ? 'image' : 'file', delivered:{}, seen:{}
    });
  };
  reader.readAsDataURL(f);
});

// ---------- GIF button (GIPHY) ----------
gifBtn?.addEventListener('click', async ()=>{
  const q = prompt('Search GIF (term):');
  if(!q) return;
  // use GIPHY public beta key (for production use get your own key)
  const key = 'dc6zaTOxFJmzC';
  const res = await fetch(`https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&api_key=${key}&limit=6`);
  const json = await res.json();
  const url = json.data[0]?.images?.downsized_medium?.url;
  if(url) {
    push(ref(db, `messages/${currentChat.id}`), {
      fromUid: me.uid, fromName: me.name, text: `<img src="${url}" style="max-width:240px"/>`,
      time: new Date().toLocaleTimeString(), type:'gif', delivered:{}, seen:{}
    });
  } else alert('No GIF found');
});

// ---------- Typing indicator + online ----------
msgInput?.addEventListener('input', ()=>{
  set(ref(db, `presence/${currentChat.id}/${me.uid}`), {name: me.name, typing: true, last: Date.now()});
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(()=> {
    set(ref(db, `presence/${currentChat.id}/${me.uid}`), {name: me.name, typing:false, last: Date.now()});
  }, 1500);
});

// listen presence for current chat
function listenStatus(){
  onValue(ref(db, `presence/${currentChat.id}`), snap=>{
    const val = snap.val() || {};
    // show typing names (excluding me)
    const typingUsers = Object.values(val).filter(u => u.typing && u.name !== me.name).map(u=>u.name);
    typingText.textContent = typingUsers.length ? `${typingUsers.join(', ')} typing...` : '';
  });
}

// ---------- Listen messages (and update delivered/seen) ----------
function listenMessages(roomId){
  messagesEl.innerHTML = '';
  const msgsRef = ref(db, `messages/${roomId}`);
  onChildAdded(msgsRef, snap=>{
    const data = snap.val(); const key = snap.key;
    showMessage(key, data);
    // mark delivered
    const deliveredPath = `messages/${roomId}/${key}/delivered/${me.uid}`;
    set(ref(db, deliveredPath), Date.now());
    // mark seen after small timeout when visible
    setTimeout(()=> set(ref(db, `messages/${roomId}/${key}/seen/${me.uid}`), Date.now()), 1000);
  });
}

// ---------- Render message ----------
function showMessage(key, data){
  const div = document.createElement('div');
  div.className = 'message ' + (data.fromUid === me.uid ? 'me' : 'other');
  // handle types
  let inner = '';
  if(data.type==='image') inner = `<img src="${data.text}" style="max-width:240px;border-radius:8px"/>`;
  else if(data.type==='gif') inner = data.text;
  else if(data.type==='file') inner = `<a href="${data.text}" target="_blank">Download file</a>`;
  else if(data.type==='voice') inner = `<audio controls src="${data.text}"></audio>`;
  else inner = escapeHtml(data.text);
  // show edited marker, reactions etc
  const meta = `<div class="meta">${data.fromName||'Anon'} • ${data.time} ${data.edited? '(edited)':''}</div>`;
  div.innerHTML = inner + meta;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ---------- Utility escape
function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') }

// ---------- Clear chat / export
clearBtn?.addEventListener('click', ()=>{
  if(confirm('Delete all messages in this chat?')){
    remove(ref(db, `messages/${currentChat.id}`));
    messagesEl.innerHTML = '';
  }
});
exportBtn?.addEventListener('click', async ()=>{
  const snap = await (await fetch(`${firebaseConfig.databaseURL}/messages/${currentChat.id}.json`)).json();
  const blob = new Blob([JSON.stringify(snap,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='chat_export.json'; a.click();
});

// ---------- Voice recording (short) ----------
voiceBtn?.addEventListener('click', async ()=>{
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    const mediaRecorder = new MediaRecorder(stream);
    let chunks=[];
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async ()=>{
      const blob = new Blob(chunks,{type:'audio/webm'});
      // upload to storage
      const reader = new FileReader();
      reader.onload = async (ev)=>{
        const base64 = ev.target.result;
        const path = `rooms/${currentChat.id}/voice_${Date.now()}.webm`;
        const storageRef = sref(storage, path);
        await uploadString(storageRef, base64, 'data_url');
        const url = await getDownloadURL(storageRef);
        push(ref(db, `messages/${currentChat.id}`), { fromUid:me.uid, fromName:me.name, text: url, time: new Date().toLocaleTimeString(), type:'voice' });
      };
      reader.readAsDataURL(blob);
    };
    mediaRecorder.start();
    voiceBtn.textContent='⏺️';
    setTimeout(()=> { mediaRecorder.stop(); voiceBtn.textContent='🎙️'; }, 5000); // 5s record
  } catch(err){ alert('Mic access denied'); }
});

// ---------- Message edit/delete/reply UI (simplified) ----------
// For brevity: user can long-press message (not implemented here). In production attach listeners to edit/delete icons per message.

// ---------- Simple client-side encryption example (AES-GCM) ----------
async function encryptMessage(plain, keyStr){
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(keyStr.slice(0,32)), {name:'AES-GCM'}, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(plain));
  // return iv + ct as base64
  const arr = new Uint8Array(iv.byteLength + ct.byteLength);
  arr.set(iv,0); arr.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode(...arr));
}
async function decryptMessage(b64, keyStr){
  const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = data.slice(0,12);
  const ct = data.slice(12);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(keyStr.slice(0,32)), {name:'AES-GCM'}, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct);
  return new TextDecoder().decode(plain);
}
// Usage: choose a shared secret per DM (not implemented automatic key exchange here).

// ---------- Push Notifications (browser) overview ----------
// For push notifications you need:
// 1) FCM server key + Cloud Function to call FCM with token
// 2) Client obtains FCM token (use firebase-messaging), register service worker
// Example server call (Node):
// fetch('https://fcm.googleapis.com/fcm/send', {method:'POST', headers:{'Authorization':'key=SERVER_KEY','Content-Type':'application/json'},body: JSON.stringify({to: clientToken, notification:{title:'New message', body:'...' }})})
// I can give full FCM client/server code on request.

// ---------- END of script.js ----------
