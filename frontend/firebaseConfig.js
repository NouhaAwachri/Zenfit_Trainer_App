import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // 👈 Add this
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDx1UbTXVpSIpfRKZrWHsHoYh6e9schJcQ",
  authDomain: "aitrainerfirebaseath.firebaseapp.com",
  projectId: "aitrainerfirebaseath",
  storageBucket: "aitrainerfirebaseath.appspot.com",
  messagingSenderId: "380120986027",
  appId: "1:380120986027:web:b0fdde89a8619f829a62ee",
  measurementId: "G-LF578VCEFN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // 👈 Export this

export { auth };
