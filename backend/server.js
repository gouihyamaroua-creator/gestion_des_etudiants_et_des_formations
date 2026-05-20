import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const app = express();
const PORT = 4000;
const JWT_SECRET = "secret_projet_fullstack";

app.use(cors());
app.use(express.json());

const DATA_DIR = "./data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function lireFichier(fichier) {
  const chemin = path.join(DATA_DIR, fichier);
  if (!fs.existsSync(chemin)) return [];
  const contenu = fs.readFileSync(chemin, "utf-8");
  if (!contenu.trim()) return [];
  return parse(contenu, { columns: true, skip_empty_lines: true });
}

function ecrireFichier(fichier, data) {
  const chemin = path.join(DATA_DIR, fichier);
  fs.writeFileSync(chemin, stringify(data, { header: true }));
}

let users = lireFichier("users.csv");
let formations = lireFichier("formations.csv");
let inscriptions = lireFichier("inscriptions.csv");

if (users.length === 0) {
  users = [
    {
      id: "1",
      nom: "Admin",
      prenom: "Principal",
      email: "admin@gmail.com",
      password: bcrypt.hashSync("admin123", 10),
      role: "admin"
    },
    {
      id: "2",
      nom: "Alami",
      prenom: "Sara",
      email: "sara@gmail.com",
      password: bcrypt.hashSync("123456", 10),
      role: "etudiant"
    }
  ];
  ecrireFichier("users.csv", users);
}

if (formations.length === 0) {
  formations = [
    { id: "1", titre: "Développement Web Full Stack", duree: "3 mois" },
    { id: "2", titre: "JavaScript Moderne", duree: "2 mois" }
  ];
  ecrireFichier("formations.csv", formations);
}

if (inscriptions.length === 0) {
  inscriptions = [{ id: "1", etudiantId: "2", formationId: "1" }];
  ecrireFichier("inscriptions.csv", inscriptions);
}

function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token manquant" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: "Token invalide" });
  }
}

function verifierAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès refusé" });
  }
  next();
}

app.get("/", (req, res) => {
  res.send("API Gestion des étudiants et formations");
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: "Email ou mot de passe incorrect" });
  const passwordValide = await bcrypt.compare(password, user.password);
  if (!passwordValide) return res.status(401).json({ message: "Email ou mot de passe incorrect" });
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
  res.json({
    token,
    user: {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role
    }
  });
});

app.get("/api/formations", verifierToken, (req, res) => {
  res.json(formations);
});

app.post("/api/formations", verifierToken, verifierAdmin, (req, res) => {
  const { titre, duree } = req.body;
  const nouvelleFormation = { id: String(Date.now()), titre, duree };
  formations.push(nouvelleFormation);
  ecrireFichier("formations.csv", formations);
  res.status(201).json(nouvelleFormation);
});

app.delete("/api/formations/:id", verifierToken, verifierAdmin, (req, res) => {
  const id = req.params.id;
  formations = formations.filter((f) => f.id !== id);
  inscriptions = inscriptions.filter((i) => i.formationId !== id);
  ecrireFichier("formations.csv", formations);
  ecrireFichier("inscriptions.csv", inscriptions);
  res.json({ message: "Formation supprimée" });
});

app.get("/api/etudiants", verifierToken, verifierAdmin, (req, res) => {
  const etudiants = users
    .filter((u) => u.role === "etudiant")
    .map(({ password, ...u }) => u);
  res.json(etudiants);
});

app.post("/api/etudiants", verifierToken, verifierAdmin, async (req, res) => {
  const { nom, prenom, email, password } = req.body;
  const existe = users.find((u) => u.email === email);
  if (existe) return res.status(400).json({ message: "Cet email existe déjà" });
  const nouvelEtudiant = {
    id: String(Date.now()),
    nom,
    prenom,
    email,
    password: bcrypt.hashSync(password, 10),
    role: "etudiant"
  };
  users.push(nouvelEtudiant);
  ecrireFichier("users.csv", users);
  res.status(201).json({
    id: nouvelEtudiant.id,
    nom: nouvelEtudiant.nom,
    prenom: nouvelEtudiant.prenom,
    email: nouvelEtudiant.email,
    role: nouvelEtudiant.role
  });
});

app.delete("/api/etudiants/:id", verifierToken, verifierAdmin, (req, res) => {
  const id = req.params.id;
  users = users.filter((u) => u.id !== id);
  inscriptions = inscriptions.filter((i) => i.etudiantId !== id);
  ecrireFichier("users.csv", users);
  ecrireFichier("inscriptions.csv", inscriptions);
  res.json({ message: "Étudiant supprimé" });
});

app.get("/api/inscriptions", verifierToken, verifierAdmin, (req, res) => {
  const resultat = inscriptions.map((inscription) => {
    const etudiant = users.find((u) => u.id === inscription.etudiantId);
    const formation = formations.find((f) => f.id === inscription.formationId);
    return { id: inscription.id, etudiant, formation };
  });
  res.json(resultat);
});

app.get("/api/mes-inscriptions", verifierToken, (req, res) => {
  const resultat = inscriptions
    .filter((i) => i.etudiantId === req.user.id)
    .map((i) => {
      const formation = formations.find((f) => f.id === i.formationId);
      return { id: i.id, formation };
    });
  res.json(resultat);
});

app.post("/api/inscriptions", verifierToken, (req, res) => {
  const { formationId } = req.body;
  const existe = inscriptions.find(
    (i) => i.etudiantId === req.user.id && i.formationId === formationId
  );
  if (existe) return res.status(400).json({ message: "Vous êtes déjà inscrit à cette formation" });
  const nouvelleInscription = {
    id: String(Date.now()),
    etudiantId: req.user.id,
    formationId
  };
  inscriptions.push(nouvelleInscription);
  ecrireFichier("inscriptions.csv", inscriptions);
  res.status(201).json(nouvelleInscription);
});

app.delete("/api/inscriptions/:id", verifierToken, (req, res) => {
  const id = req.params.id;
  inscriptions = inscriptions.filter(
    (i) => !(i.id === id && i.etudiantId === req.user.id)
  );
  ecrireFichier("inscriptions.csv", inscriptions);
  res.json({ message: "Inscription supprimée" });
});

app.listen(PORT, () => {
  console.log(`Backend lancé sur http://localhost:${PORT}`);
});