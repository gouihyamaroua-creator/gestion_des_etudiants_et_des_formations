<template>
  <div class="app">
    <header>
      <h1>Gestion des étudiants et des formations</h1>

      <div v-if="user" class="user-box">
        <span>{{ user.prenom }} {{ user.nom }} - {{ user.role }}</span>
        <button @click="logout">Déconnexion</button>
      </div>
    </header>

    <main v-if="!user" class="login-page">
      <form @submit.prevent="login" class="card">
        <h2>Connexion</h2>

        <input v-model="loginForm.email" type="email" placeholder="Email" required />
        <input v-model="loginForm.password" type="password" placeholder="Mot de passe" required />

        <button type="submit">Se connecter</button>

        <p class="error" v-if="message">{{ message }}</p>
      </form>
    </main>

    <main v-else>
      <section v-if="user.role === 'admin'" class="grid">
        <div class="card">
          <h2>Ajouter une formation</h2>

          <form @submit.prevent="ajouterFormation">
            <input v-model="formationForm.titre" placeholder="Titre" required />
            <input v-model="formationForm.duree" placeholder="Durée" required />
            <button type="submit">Ajouter</button>
          </form>

          <h3>Liste des formations</h3>

          <ul>
            <li v-for="formation in formations" :key="formation.id">
              <span>{{ formation.titre }} - {{ formation.duree }}</span>
              <button @click="supprimerFormation(formation.id)">Supprimer</button>
            </li>
          </ul>
        </div>

        <div class="card">
          <h2>Ajouter un étudiant</h2>

          <form @submit.prevent="ajouterEtudiant">
            <input v-model="etudiantForm.nom" placeholder="Nom" required />
            <input v-model="etudiantForm.prenom" placeholder="Prénom" required />
            <input v-model="etudiantForm.email" type="email" placeholder="Email" required />
            <input v-model="etudiantForm.password" type="password" placeholder="Mot de passe" required />
            <button type="submit">Ajouter</button>
          </form>

          <h3>Liste des étudiants</h3>

          <ul>
            <li v-for="etudiant in etudiants" :key="etudiant.id">
              <span>{{ etudiant.prenom }} {{ etudiant.nom }} - {{ etudiant.email }}</span>
              <button @click="supprimerEtudiant(etudiant.id)">Supprimer</button>
            </li>
          </ul>
        </div>

        <div class="card full">
          <h2>Inscriptions</h2>

          <table>
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Formation</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="inscription in inscriptions" :key="inscription.id">
                <td>
                  {{ inscription.etudiant?.prenom }}
                  {{ inscription.etudiant?.nom }}
                </td>
                <td>{{ inscription.formation?.titre }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="user.role === 'etudiant'" class="grid">
        <div class="card">
          <h2>Formations disponibles</h2>

          <ul>
            <li v-for="formation in formations" :key="formation.id">
              <span>{{ formation.titre }} - {{ formation.duree }}</span>
              <button @click="inscrire(formation.id)">S'inscrire</button>
            </li>
          </ul>
        </div>

        <div class="card">
          <h2>Mes inscriptions</h2>

          <ul>
            <li v-for="inscription in mesInscriptions" :key="inscription.id">
              <span>{{ inscription.formation?.titre }}</span>
              <button @click="annulerInscription(inscription.id)">Annuler</button>
            </li>
          </ul>
        </div>
      </section>

      <p class="success" v-if="message">{{ message }}</p>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const API_URL = "http://localhost:4000/api";

const user = ref(JSON.parse(localStorage.getItem("user")) || null);
const token = ref(localStorage.getItem("token") || "");

const message = ref("");

const loginForm = ref({
  email: "",
  password: ""
});

const formationForm = ref({
  titre: "",
  duree: ""
});

const etudiantForm = ref({
  nom: "",
  prenom: "",
  email: "",
  password: ""
});

const formations = ref([]);
const etudiants = ref([]);
const inscriptions = ref([]);
const mesInscriptions = ref([]);

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value}`
  };
}

async function login() {
  message.value = "";

  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(loginForm.value)
  });

  const data = await response.json();

  if (!response.ok) {
    message.value = data.message;
    return;
  }

  token.value = data.token;
  user.value = data.user;

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  await chargerDonnees();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  user.value = null;
  token.value = "";
}

async function chargerFormations() {
  const response = await fetch(`${API_URL}/formations`, {
    headers: headers()
  });

  formations.value = await response.json();
}

async function chargerEtudiants() {
  const response = await fetch(`${API_URL}/etudiants`, {
    headers: headers()
  });

  etudiants.value = await response.json();
}

async function chargerInscriptions() {
  const response = await fetch(`${API_URL}/inscriptions`, {
    headers: headers()
  });

  inscriptions.value = await response.json();
}

async function chargerMesInscriptions() {
  const response = await fetch(`${API_URL}/mes-inscriptions`, {
    headers: headers()
  });

  mesInscriptions.value = await response.json();
}

async function chargerDonnees() {
  if (!user.value) return;

  await chargerFormations();

  if (user.value.role === "admin") {
    await chargerEtudiants();
    await chargerInscriptions();
  }

  if (user.value.role === "etudiant") {
    await chargerMesInscriptions();
  }
}

async function ajouterFormation() {
  await fetch(`${API_URL}/formations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(formationForm.value)
  });

  formationForm.value = {
    titre: "",
    duree: ""
  };

  message.value = "Formation ajoutée";
  await chargerDonnees();
}

async function supprimerFormation(id) {
  await fetch(`${API_URL}/formations/${id}`, {
    method: "DELETE",
    headers: headers()
  });

  message.value = "Formation supprimée";
  await chargerDonnees();
}

async function ajouterEtudiant() {
  const response = await fetch(`${API_URL}/etudiants`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(etudiantForm.value)
  });

  const data = await response.json();

  if (!response.ok) {
    message.value = data.message;
    return;
  }

  etudiantForm.value = {
    nom: "",
    prenom: "",
    email: "",
    password: ""
  };

  message.value = "Étudiant ajouté";
  await chargerDonnees();
}

async function supprimerEtudiant(id) {
  await fetch(`${API_URL}/etudiants/${id}`, {
    method: "DELETE",
    headers: headers()
  });

  message.value = "Étudiant supprimé";
  await chargerDonnees();
}

async function inscrire(formationId) {
  const response = await fetch(`${API_URL}/inscriptions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ formationId })
  });

  const data = await response.json();

  if (!response.ok) {
    message.value = data.message;
    return;
  }

  message.value = "Inscription effectuée";
  await chargerDonnees();
}

async function annulerInscription(id) {
  await fetch(`${API_URL}/inscriptions/${id}`, {
    method: "DELETE",
    headers: headers()
  });

  message.value = "Inscription annulée";
  await chargerDonnees();
}

onMounted(() => {
  chargerDonnees();
});
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f3f6fb;
  color: #1f2937;
}

header {
  background: #2563eb;
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  margin: 0;
  font-size: 24px;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

main {
  padding: 24px;
}

.login-page {
  display: flex;
  justify-content: center;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.card h2 {
  margin-top: 0;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.full {
  grid-column: 1 / -1;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  background: #f8fafc;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.user-box {
  display: flex;
  gap: 12px;
  align-items: center;
}

.error {
  color: #dc2626;
}

.success {
  color: #16a34a;
  font-weight: bold;
}

.demo {
  margin-top: 16px;
  font-size: 14px;
  background: #eef2ff;
  padding: 12px;
  border-radius: 6px;
}

@media (max-width: 800px) {
  header {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>