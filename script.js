// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
