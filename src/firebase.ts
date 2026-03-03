import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhVkTP1B425XmDNkAQjoXTYOkCr5T2HFI",
  authDomain: "acompanhamento-consultores.firebaseapp.com",
  databaseURL: "https://acompanhamento-consultores-default-rtdb.firebaseio.com",
  projectId: "acompanhamento-consultores",
  storageBucket: "acompanhamento-consultores.firebasestorage.app",
  messagingSenderId: "623792488916",
  appId: "1:623792488916:web:29c37d1e20eccc0b9ed641",
  measurementId: "G-9329SWHFBG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics initialization with support check (important for SSR/Iframe environments)
export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export default app;
