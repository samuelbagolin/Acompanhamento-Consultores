import express from "express";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, set, update, push, child, remove } from "firebase/database";

// Firebase Configuration
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
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const app = express();
app.use(express.json());

// Helper to get data from Firebase
const getData = async (dbPath: string) => {
  const snapshot = await get(ref(db, dbPath));
  return snapshot.exists() ? snapshot.val() : null;
};

// Seed initial data if empty
const seedData = async () => {
  const sectors = await getData("sectors");
  if (!sectors) {
    const initialSectors = {
      "1": { id: "1", name: "Agendamento", color: "#3b82f6" },
      "2": { id: "2", name: "Onboarding", color: "#f97316" },
      "3": { id: "3", name: "Ongoing", color: "#10b981" },
      "4": { id: "4", name: "Retenção", color: "#ef4444" },
      "5": { id: "5", name: "Chat", color: "#8b5cf6" }
    };
    await set(ref(db, "sectors"), initialSectors);
  }

  const months = await getData("months");
  if (!months) {
    const monthId = Date.now().toString();
    await set(ref(db, `months/${monthId}`), { id: monthId, name: "03/2026" });
  }
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", firebase: "connected" });
});

app.get("/api/months", async (req, res) => {
  try {
    await seedData();
    const months = await getData("months");
    res.json(months ? Object.values(months).reverse() : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sectors", async (req, res) => {
  try {
    const sectors = await getData("sectors");
    res.json(sectors ? Object.values(sectors) : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/:monthId/:sectorId", async (req, res) => {
  const { monthId, sectorId } = req.params;
  try {
    const sectors = await getData("sectors") || {};
    const sector = sectors[sectorId];
    
    const allEmployees = await getData("employees") || {};
    const employees = Object.values(allEmployees).filter((e: any) => e.month_id === monthId && e.sector_id === sectorId);
    
    const allIndicators = await getData("indicators") || {};
    const indicators = Object.values(allIndicators)
      .filter((i: any) => i.month_id === monthId && i.sector_id === sectorId)
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    
    const allValues = await getData("performance_values") || {};
    const values = Object.values(allValues).filter((v: any) => {
      const ind = allIndicators[v.indicator_id];
      return ind && ind.month_id === monthId && ind.sector_id === sectorId;
    });

    res.json({ sector, employees, indicators, values });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employees", async (req, res) => {
  const { id, month_id, sector_id, name, image_url, goal } = req.body;
  try {
    if (id) {
      await update(ref(db, `employees/${id}`), { name, image_url, goal });
      res.json({ success: true });
    } else {
      const newId = push(child(ref(db), "employees")).key;
      await set(ref(db, `employees/${newId}`), { id: newId, month_id, sector_id, name, image_url, goal });
      res.json({ id: newId });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/values", async (req, res) => {
  const { indicator_id, employee_id, value } = req.body;
  try {
    const valKey = `${indicator_id}_${employee_id}`;
    await set(ref(db, `performance_values/${valKey}`), { indicator_id, employee_id, value });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sectors/logo", async (req, res) => {
  const { id, logo_url } = req.body;
  try {
    await update(ref(db, `sectors/${id}`), { logo_url });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel
export default app;
