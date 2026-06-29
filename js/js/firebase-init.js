import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-ouO2tOj6o1L3lL6rntLxkbaay-inDrA",
  authDomain: "kims-design.firebaseapp.com",
  projectId: "kims-design",
  storageBucket: "kims-design.firebasestorage.app",
  messagingSenderId: "867532531425",
  appId: "1:867532531425:web:5e287ce69bff5fcec179a0"
};

const app = initializeApp(firebaseConfig);
window.db = getFirestore(app);
window.storage = getStorage(app);
