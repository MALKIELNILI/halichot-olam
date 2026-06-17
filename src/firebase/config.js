import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCtTCUNeYzRMlSLe2VJs_ols818QI1ZuTA",
  authDomain: "sarikow-3342b.firebaseapp.com",
  databaseURL: "https://sarikow-3342b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sarikow-3342b",
  storageBucket: "sarikow-3342b.firebasestorage.app",
  messagingSenderId: "95850039076",
  appId: "1:95850039076:web:4149b5724c52fbdaa315b1"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
