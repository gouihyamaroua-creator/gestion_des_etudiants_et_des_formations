import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 4000;
const JWT_SECRET = "secret_projet_fullstack";

app.use(cors());
app.use(express.json());

let users = [
  {
    id: 1,
    nom: "Admin",
    prenom: "Principal",
    email: "admin@gmail.com",
    password: bcrypt.hashSync("admin123", 10),
    role: "admin"
  },
  {
    id: 2,
    nom: "Alami",
    prenom: "Sara",
    email: "sara@gmail.com",
    password: bcrypt.hashSync("123456", 10),
    role: "etudiant"
  }
];

let formations = [
  {
    id: 1,
    titre: "Développement Web Full Stack",
    duree: "3 mois"
  },
  {
    id: 2,
    titre: "JavaScript Moderne",
    duree: "2 mois"
  }
];

let inscriptions = [
  {
    id: 1,
    etudiantId: 2,
    formationId: 1
  }
];

function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token manquant" });
  }

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

  if (!user) {
    return res.status(401).json({ message: "Email ou mot de passe incorrect" });
  }

  const passwordValide = await bcrypt.compare(password, user.password);

  if (!passwordValide) {
    return res.status(401).json({ message: "Email ou mot de passe incorrect" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
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

  const nouvelleFormation = {
    id: Date.now(),
    titre,
    duree
  };

  formations.push(nouvelleFormation);
  res.status(201).json(nouvelleFormation);
});

app.delete("/api/formations/:id", verifierToken, verifierAdmin, (req, res) => {
  const id = Number(req.params.id);

  formations = formations.filter((formation) => formation.id !== id);
  inscriptions = inscriptions.filter((inscription) => inscription.formationId !== id);

  res.json({ message: "Formation supprimée" });
});

app.get("/api/etudiants", verifierToken, verifierAdmin, (req, res) => {
  const etudiants = users
    .filter((user) => user.role === "etudiant")
    .map(({ password, ...userSansPassword }) => userSansPassword);

  res.json(etudiants);
});

app.post("/api/etudiants", verifierToken, verifierAdmin, (req, res) => {
  const { nom, prenom, email, password } = req.body;

  const existe = users.find((user) => user.email === email);

  if (existe) {
    return res.status(400).json({ message: "Cet email existe déjà" });
  }

  const nouvelEtudiant = {
    id: Date.now(),
    nom,
    prenom,
    email,
    password: bcrypt.hashSync(password, 10),
    role: "etudiant"
  };

  users.push(nouvelEtudiant);

  res.status(201).json({
    id: nouvelEtudiant.id,
    nom: nouvelEtudiant.nom,
    prenom: nouvelEtudiant.prenom,
    email: nouvelEtudiant.email,
    role: nouvelEtudiant.role
  });
});

app.delete("/api/etudiants/:id", verifierToken, verifierAdmin, (req, res) => {
  const id = Number(req.params.id);

  users = users.filter((user) => user.id !== id);
  inscriptions = inscriptions.filter((inscription) => inscription.etudiantId !== id);

  res.json({ message: "Étudiant supprimé" });
});

app.get("/api/inscriptions", verifierToken, verifierAdmin, (req, res) => {
  const resultat = inscriptions.map((inscription) => {
    const etudiant = users.find((user) => user.id === inscription.etudiantId);
    const formation = formations.find((formation) => formation.id === inscription.formationId);

    return {
      id: inscription.id,
      etudiant,
      formation
    };
  });

  res.json(resultat);
});

app.get("/api/mes-inscriptions", verifierToken, (req, res) => {
  const resultat = inscriptions
    .filter((inscription) => inscription.etudiantId === req.user.id)
    .map((inscription) => {
      const formation = formations.find(
        (formation) => formation.id === inscription.formationId
      );

      return {
        id: inscription.id,
        formation
      };
    });

  res.json(resultat);
});

app.post("/api/inscriptions", verifierToken, (req, res) => {
  const { formationId } = req.body;

  const existe = inscriptions.find(
    (inscription) =>
      inscription.etudiantId === req.user.id &&
      inscription.formationId === formationId
  );

  if (existe) {
    return res.status(400).json({
      message: "Vous êtes déjà inscrit à cette formation"
    });
  }

  const nouvelleInscription = {
    id: Date.now(),
    etudiantId: req.user.id,
    formationId
  };

  inscriptions.push(nouvelleInscription);

  res.status(201).json(nouvelleInscription);
});

app.delete("/api/inscriptions/:id", verifierToken, (req, res) => {
  const id = Number(req.params.id);

  inscriptions = inscriptions.filter(
    (inscription) =>
      !(inscription.id === id && inscription.etudiantId === req.user.id)
  );

  res.json({ message: "Inscription supprimée" });
});

app.listen(PORT, () => {
  console.log(`Backend lancé sur http://localhost:${PORT}`);
});