import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("dashboard.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS months (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    color TEXT,
    logo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month_id INTEGER,
    sector_id INTEGER,
    name TEXT,
    image_url TEXT,
    goal TEXT,
    FOREIGN KEY(month_id) REFERENCES months(id),
    FOREIGN KEY(sector_id) REFERENCES sectors(id)
  );

  CREATE TABLE IF NOT EXISTS indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month_id INTEGER,
    sector_id INTEGER,
    name TEXT,
    type TEXT, -- 'NUMBER', 'PERCENT', 'CURRENCY'
    is_negative INTEGER DEFAULT 0,
    order_index INTEGER,
    FOREIGN KEY(month_id) REFERENCES months(id),
    FOREIGN KEY(sector_id) REFERENCES sectors(id)
  );

  CREATE TABLE IF NOT EXISTS performance_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    indicator_id INTEGER,
    employee_id INTEGER,
    value REAL,
    FOREIGN KEY(indicator_id) REFERENCES indicators(id),
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );
`);

// Seed initial sectors if empty
const sectorCount = db.prepare("SELECT COUNT(*) as count FROM sectors").get() as { count: number };
if (sectorCount.count === 0) {
  const insertSector = db.prepare("INSERT INTO sectors (name, color) VALUES (?, ?)");
  insertSector.run("Agendamento", "#3b82f6");
  insertSector.run("Onboarding", "#f97316");
  insertSector.run("Ongoing", "#10b981");
  insertSector.run("Retenção", "#ef4444");
  insertSector.run("Chat", "#8b5cf6");
}

// Seed initial month if empty
const monthCount = db.prepare("SELECT COUNT(*) as count FROM months").get() as { count: number };
if (monthCount.count === 0) {
  const currentMonth = "03/2026";
  const insertMonth = db.prepare("INSERT INTO months (name) VALUES (?)");
  const monthResult = insertMonth.run(currentMonth);
  const monthId = monthResult.lastInsertRowid;

  // Seed Onboarding example
  const onboardingSector = db.prepare("SELECT id FROM sectors WHERE name = 'Onboarding'").get() as { id: number };
  
  const employees = [
    { name: "Colaborador 1", img: "https://picsum.photos/seed/p1/100/100" },
    { name: "Colaborador 2", img: "https://picsum.photos/seed/p2/100/100" },
    { name: "Colaborador 3", img: "https://picsum.photos/seed/p3/100/100" },
    { name: "Colaborador 4", img: "https://picsum.photos/seed/p4/100/100" },
    { name: "Colaborador 5", img: "https://picsum.photos/seed/p5/100/100" },
    { name: "Colaborador 6", img: "https://picsum.photos/seed/p6/100/100" },
  ];

  const empIds: number[] = [];
  const insertEmp = db.prepare("INSERT INTO employees (month_id, sector_id, name, image_url) VALUES (?, ?, ?, ?)");
  for (const emp of employees) {
    const res = insertEmp.run(monthId, onboardingSector.id, emp.name, emp.img);
    empIds.push(Number(res.lastInsertRowid));
  }

  const indicators = [
    { name: "Clientes Ativos (Simples)", type: "NUMBER" },
    { name: "Clientes Ativos (Recupera)", type: "NUMBER" },
    { name: "Clientes Migrados", type: "NUMBER" },
    { name: "% carteira concluída", type: "PERCENT" },
    { name: "CSAT médio", type: "PERCENT" },
    { name: "Total de Avaliação", type: "NUMBER" },
    { name: "Backlog", type: "NUMBER" },
    { name: "Chamados em Aberto", type: "NUMBER" },
    { name: "Cancelamentos", type: "NUMBER", is_negative: 1 },
    { name: "Inadimplente", type: "NUMBER", is_negative: 1 },
    { name: "Cancelamento Automáticos", type: "NUMBER", is_negative: 1 },
    { name: "Valor Perdido (Setor)", type: "CURRENCY", is_negative: 1 },
    { name: "Valor Recuperado (Setor)", type: "CURRENCY" },
  ];

  const insertInd = db.prepare("INSERT INTO indicators (month_id, sector_id, name, type, is_negative, order_index) VALUES (?, ?, ?, ?, ?, ?)");
  const insertVal = db.prepare("INSERT INTO performance_values (indicator_id, employee_id, value) VALUES (?, ?, ?)");

  indicators.forEach((ind, idx) => {
    const res = insertInd.run(monthId, onboardingSector.id, ind.name, ind.type, ind.is_negative || 0, idx);
    const indId = res.lastInsertRowid;
    
    empIds.forEach(empId => {
      // Random data for example
      const val = ind.type === 'PERCENT' ? Math.random() : Math.floor(Math.random() * 50);
      insertVal.run(indId, empId, val);
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/months", (req, res) => {
    const months = db.prepare("SELECT * FROM months ORDER BY id DESC").all();
    res.json(months);
  });

  app.post("/api/months", (req, res) => {
    const { name, copyFromId } = req.body;
    try {
      const insertMonth = db.prepare("INSERT INTO months (name) VALUES (?)");
      const result = insertMonth.run(name);
      const newMonthId = result.lastInsertRowid;

      if (copyFromId) {
        // Copy structure from previous month
        const sectors = db.prepare("SELECT id FROM sectors").all() as { id: number }[];
        
        for (const sector of sectors) {
          // Copy employees
          const employees = db.prepare("SELECT * FROM employees WHERE month_id = ? AND sector_id = ?").all(copyFromId, sector.id) as any[];
          const empMap = new Map();
          
          for (const emp of employees) {
            const res = db.prepare("INSERT INTO employees (month_id, sector_id, name, image_url, goal) VALUES (?, ?, ?, ?, ?)")
              .run(newMonthId, sector.id, emp.name, emp.image_url, emp.goal);
            empMap.set(emp.id, res.lastInsertRowid);
          }

          // Copy indicators
          const indicators = db.prepare("SELECT * FROM indicators WHERE month_id = ? AND sector_id = ?").all(copyFromId, sector.id) as any[];
          for (const ind of indicators) {
            const res = db.prepare("INSERT INTO indicators (month_id, sector_id, name, type, is_negative, order_index) VALUES (?, ?, ?, ?, ?, ?)")
              .run(newMonthId, sector.id, ind.name, ind.type, ind.is_negative, ind.order_index);
            const newIndId = res.lastInsertRowid;

            // Initialize values to 0
            for (const [oldEmpId, newEmpId] of empMap.entries()) {
              db.prepare("INSERT INTO performance_values (indicator_id, employee_id, value) VALUES (?, ?, ?)")
                .run(newIndId, newEmpId, 0);
            }
          }
        }
      }

      res.json({ id: newMonthId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/sectors", (req, res) => {
    try {
      const sectors = db.prepare("SELECT * FROM sectors").all();
      res.json(sectors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/dashboard/:monthId/:sectorId", (req, res) => {
    const { monthId, sectorId } = req.params;
    try {
      const sector = db.prepare("SELECT * FROM sectors WHERE id = ?").get(sectorId);
      const employees = db.prepare("SELECT * FROM employees WHERE month_id = ? AND sector_id = ?").all(monthId, sectorId);
      const indicators = db.prepare("SELECT * FROM indicators WHERE month_id = ? AND sector_id = ? ORDER BY order_index ASC").all(monthId, sectorId);
      
      const values = db.prepare(`
        SELECT pv.* 
        FROM performance_values pv
        JOIN indicators i ON pv.indicator_id = i.id
        WHERE i.month_id = ? AND i.sector_id = ?
      `).all(monthId, sectorId);

      res.json({ sector, employees, indicators, values });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/employees", (req, res) => {
    const { id, month_id, sector_id, name, image_url, goal } = req.body;
    try {
      if (id) {
        db.prepare("UPDATE employees SET name = ?, image_url = ?, goal = ? WHERE id = ?").run(name, image_url, goal, id);
        res.json({ success: true });
      } else {
        const result = db.prepare("INSERT INTO employees (month_id, sector_id, name, image_url, goal) VALUES (?, ?, ?, ?, ?)")
          .run(month_id, sector_id, name, image_url, goal);
        
        // Initialize values for existing indicators
        const indicators = db.prepare("SELECT id FROM indicators WHERE month_id = ? AND sector_id = ?").all(month_id, sector_id) as { id: number }[];
        for (const ind of indicators) {
          db.prepare("INSERT INTO performance_values (indicator_id, employee_id, value) VALUES (?, ?, ?)")
            .run(ind.id, result.lastInsertRowid, 0);
        }
        res.json({ id: result.lastInsertRowid });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/employees/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM performance_values WHERE employee_id = ?").run(req.params.id);
      db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/indicators", (req, res) => {
    const { id, month_id, sector_id, name, type, is_negative } = req.body;
    try {
      if (id) {
        db.prepare("UPDATE indicators SET name = ?, type = ?, is_negative = ? WHERE id = ?").run(name, type, is_negative ? 1 : 0, id);
        res.json({ success: true });
      } else {
        const count = db.prepare("SELECT COUNT(*) as count FROM indicators WHERE month_id = ? AND sector_id = ?").get(month_id, sector_id) as { count: number };
        const result = db.prepare("INSERT INTO indicators (month_id, sector_id, name, type, is_negative, order_index) VALUES (?, ?, ?, ?, ?, ?)")
          .run(month_id, sector_id, name, type, is_negative ? 1 : 0, count.count);
        
        // Initialize values for existing employees
        const employees = db.prepare("SELECT id FROM employees WHERE month_id = ? AND sector_id = ?").all(month_id, sector_id) as { id: number }[];
        for (const emp of employees) {
          db.prepare("INSERT INTO performance_values (indicator_id, employee_id, value) VALUES (?, ?, ?)")
            .run(result.lastInsertRowid, emp.id, 0);
        }
        res.json({ id: result.lastInsertRowid });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/indicators/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM performance_values WHERE indicator_id = ?").run(req.params.id);
      db.prepare("DELETE FROM indicators WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/values", (req, res) => {
    const { indicator_id, employee_id, value } = req.body;
    try {
      db.prepare("UPDATE performance_values SET value = ? WHERE indicator_id = ? AND employee_id = ?")
        .run(value, indicator_id, employee_id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sectors/logo", (req, res) => {
    const { id, logo_url } = req.body;
    try {
      db.prepare("UPDATE sectors SET logo_url = ? WHERE id = ?").run(logo_url, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
