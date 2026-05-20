<template>
  <div class="app">
    <header>
      <div class="header-content">
        <h1>Gestion des étudiants et des formations</h1>
        <p class="subtitle">Plateforme de gestion académique</p>
      </div>
      <div v-if="user" class="user-box">
        <span>{{ user.prenom }} {{ user.nom }} — {{ user.role }}</span>
        <button @click="logout">Déconnexion</button>
      </div>
    </header>

    <main v-if="!user" class="login-page">
      <form @submit.prevent="login" class="card login-card">
        <div class="login-deco">
          <span>🦋</span><span>🌸</span><span>🦋</span>
        </div>
        <h2>Connexion</h2>
        <p class="login-sub">Bienvenue sur votre espace académique</p>
        <input v-model="loginForm.email" type="email" placeholder="✉️  Email" required />
        <input v-model="loginForm.password" type="password" placeholder="🔒  Mot de passe" required />
        <button type="submit">Se connecter 🌸</button>
        <p class="error" v-if="message">{{ message }}</p>
        <div class="login-deco bottom">
          <span>🌷</span><span>✨</span><span>🌷</span>
        </div>
      </form>
    </main>

    <main v-else>
      <section v-if="user.role === 'admin'" class="grid">
        <div class="card">
          <h2>🌸 Ajouter une formation</h2>
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
          <h2>🦋 Ajouter un étudiant</h2>
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
          <h2>🌷 Inscriptions</h2>
          <table>
            <thead>
              <tr>
                <th>✨ Étudiant</th>
                <th>📚 Formation</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inscription in inscriptions" :key="inscription.id">
                <td>{{ inscription.etudiant?.prenom }} {{ inscription.etudiant?.nom }}</td>
                <td>{{ inscription.formation?.titre }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="user.role === 'etudiant'" class="grid">
        <div class="card">
          <h2>🌸 Formations disponibles</h2>
          <ul>
            <li v-for="formation in formations" :key="formation.id">
              <span>{{ formation.titre }} - {{ formation.duree }}</span>
              <button @click="inscrire(formation.id)">S'inscrire</button>
            </li>
          </ul>
        </div>
        <div class="card">
          <h2>🦋 Mes inscriptions</h2>
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

const loginForm = ref({ email: "", password: "" });
const formationForm = ref({ titre: "", duree: "" });
const etudiantForm = ref({ nom: "", prenom: "", email: "", password: "" });

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginForm.value)
  });
  const data = await response.json();
  if (!response.ok) { message.value = data.message; return; }
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
  const response = await fetch(`${API_URL}/formations`, { headers: headers() });
  formations.value = await response.json();
}

async function chargerEtudiants() {
  const response = await fetch(`${API_URL}/etudiants`, { headers: headers() });
  etudiants.value = await response.json();
}

async function chargerInscriptions() {
  const response = await fetch(`${API_URL}/inscriptions`, { headers: headers() });
  inscriptions.value = await response.json();
}

async function chargerMesInscriptions() {
  const response = await fetch(`${API_URL}/mes-inscriptions`, { headers: headers() });
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
    method: "POST", headers: headers(),
    body: JSON.stringify(formationForm.value)
  });
  formationForm.value = { titre: "", duree: "" };
  message.value = "Formation ajoutée ✨";
  await chargerDonnees();
}

async function supprimerFormation(id) {
  await fetch(`${API_URL}/formations/${id}`, { method: "DELETE", headers: headers() });
  message.value = "Formation supprimée";
  await chargerDonnees();
}

async function ajouterEtudiant() {
  const response = await fetch(`${API_URL}/etudiants`, {
    method: "POST", headers: headers(),
    body: JSON.stringify(etudiantForm.value)
  });
  const data = await response.json();
  if (!response.ok) { message.value = data.message; return; }
  etudiantForm.value = { nom: "", prenom: "", email: "", password: "" };
  message.value = "Étudiant ajouté 🌸";
  await chargerDonnees();
}

async function supprimerEtudiant(id) {
  await fetch(`${API_URL}/etudiants/${id}`, { method: "DELETE", headers: headers() });
  message.value = "Étudiant supprimé";
  await chargerDonnees();
}

async function inscrire(formationId) {
  const response = await fetch(`${API_URL}/inscriptions`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ formationId })
  });
  const data = await response.json();
  if (!response.ok) { message.value = data.message; return; }
  message.value = "Inscription effectuée 🦋";
  await chargerDonnees();
}

async function annulerInscription(id) {
  await fetch(`${API_URL}/inscriptions/${id}`, { method: "DELETE", headers: headers() });
  message.value = "Inscription annulée";
  await chargerDonnees();
}

onMounted(() => { chargerDonnees(); });
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #f9f0f5;
  color: #2d1b2e;
}

header {
  background: linear-gradient(135deg, #993556 0%, #534AB7 100%);
  color: white;
  padding: 36px 28px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 12px rgba(153, 53, 86, 0.3);
  position: relative;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12px;
}

header h1 {
  margin: 0 0 6px;
  font-size: 36px;
  font-weight: 700;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 1px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.15);
}

.subtitle {
  font-size: 14px;
  font-family: 'Georgia', serif;
  font-style: italic;
  opacity: 0.85;
  margin: 0;
  letter-spacing: 0.5px;
}

.user-box {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
  position: absolute;
  top: 20px;
  right: 28px;
}

button {
  background: linear-gradient(135deg, #D4537E, #7F77DD);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: opacity 0.2s, transform 0.1s;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

button:active {
  transform: scale(0.97);
}

input {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 10px;
  border: 1.5px solid #F4C0D1;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #2d1b2e;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #D4537E;
}

main {
  padding: 28px;
  max-width: 1100px;
  margin: 0 auto;
}

.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 140px);
}

.login-card {
  width: 100%;
  max-width: 420px;
  text-align: center;
  border: 1.5px solid #F4C0D1;
  background: linear-gradient(160deg, #fff 60%, #fdf0f6 100%);
  padding: 36px 32px;
}

.login-card h2 {
  font-family: 'Georgia', serif;
  font-size: 26px;
  color: #72243E;
  margin-bottom: 6px;
  margin-top: 0;
}

.login-sub {
  font-size: 13px;
  color: #993556;
  font-style: italic;
  margin-bottom: 20px;
}

.login-deco {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 22px;
  margin-bottom: 16px;
}

.login-deco.bottom {
  margin-top: 20px;
  margin-bottom: 0;
}

.login-card input {
  text-align: left;
  background: #fff8fb;
  border: 1.5px solid #F4C0D1;
}

.login-card button {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  border-radius: 25px;
  background: linear-gradient(135deg, #D4537E, #7F77DD);
  letter-spacing: 0.5px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.full {
  grid-column: 1 / -1;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 14px;
  border: 1px solid #F4C0D1;
  box-shadow: 0 4px 20px rgba(212, 83, 126, 0.08);
}

.card h2 {
  margin-top: 0;
  color: #72243E;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  font-family: 'Georgia', serif;
}

.card h3 {
  color: #993556;
  font-size: 15px;
  font-weight: 600;
  margin: 16px 0 10px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  background: #fdf4f7;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid #F4C0D1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  font-size: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 12px 16px;
  background: linear-gradient(135deg, #fdf0f6, #EEEDFE);
  border-bottom: 2px solid #F4C0D1;
  text-align: left;
  font-size: 13px;
  color: #72243E;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Georgia', serif;
}

td {
  padding: 12px 16px;
  border-bottom: 1px solid #fde8f0;
  font-size: 14px;
}

tbody tr:hover {
  background: #fdf4f7;
  transition: background 0.2s;
}

tbody tr:last-child td {
  border-bottom: none;
}

.error {
  color: #c0392b;
  font-size: 14px;
  margin-top: 6px;
}

.success {
  color: #534AB7;
  font-weight: 600;
  font-size: 14px;
  margin-top: 12px;
  text-align: center;
}

@media (max-width: 800px) {
  header {
    padding: 24px 16px;
  }

  header h1 {
    font-size: 24px;
  }

  .user-box {
    position: static;
    margin-top: 12px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .full {
    max-width: 100%;
  }
}
</style>