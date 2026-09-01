/* UnderFy • UTA — camada compartilhada Supabase
   Importante: usa apenas a chave pública (anon/publishable).
   Nenhuma consulta de conteúdo depende de created_at.
   Não existe código de streams nesta versão.
*/
const SUPABASE_URL = "https://gnibzbnypirjrcaoibkx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_b9yvSbmWOLVJvq4AB4CLmQ_VRuzpG5T";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
const pub = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let currentUser = null;
let currentProfile = null;

const PH = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">' +
  '<rect width="600" height="600" fill="#151515"/>' +
  '<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#666" font-size="54" font-family="Arial">UnderFy</text></svg>'
);

const esc = v => String(v ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;");

const val = (row, names) => {
  for (const n of names) {
    if (row && row[n] !== undefined && row[n] !== null && String(row[n]).trim() !== "") return row[n];
  }
  return "";
};

const nameOf = row => val(row, ["nome","titulo","name","title"]);
const imageOf = row => val(row, ["capa_url","cover_url","foto_url","imagem_url","image_url","avatar_url","capa","foto"]);
const audioOf = row => val(row, ["audio_url","arquivo_url","mp3_url","musica_url","url_audio","audio","url","link_audio"]);
const artistIdOf = row => val(row, ["artista_id","artist_id","usuario_artista_id","artist_id"]);
const storyMediaOf = row => val(row, ["media_url","video_url","imagem_url","image_url","foto_url","url","arquivo_url"]);
const textOf = row => val(row, ["texto","conteudo","content","descricao","description","mensagem","texto_barras"]);
const dateOf = row => val(row, ["created_at","criado_em","publicado_em","data_criacao","data_publicacao"]);

const safeUrl = u => {
  try { new URL(String(u), location.href); return String(u); }
  catch { return PH; }
};

const sortName = (a,b) => String(nameOf(a)).localeCompare(String(nameOf(b)), "pt-BR");
const sortNewest = (a,b) => (Date.parse(dateOf(b))||0) - (Date.parse(dateOf(a))||0);

function iconRefresh(){
  if (window.lucide) try { lucide.createIcons(); } catch {}
}

function go(page){
  location.href = page;
}

async function readPublic(table, limit=500){
  try {
    const r = await pub.from(table).select("*").limit(limit);
    return r;
  } catch (e) {
    return {data:null,error:e};
  }
}

async function readAuth(table, columns="*", limit=500){
  if (!currentUser) return {data:[],error:null};

  try {
    return await db.from(table).select(columns).limit(limit);
  } catch (e) {
    return {data:null,error:e};
  }
}

function setStatus(id, msg, error=false){
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = msg;
  el.classList.toggle("error", !!error);
}

async function loadSession(){
  try {
    const r = await db.auth.getSession();

    currentUser = r.data?.session?.user || null;

    if (currentUser) {
      await loadProfile();
    }
  } catch {}

  updateAccountUI();
}

async function loadProfile(){
  if (!currentUser) {
    currentProfile = null;
    return;
  }

  try {
    const r = await db
      .from("perfis_ouvintes")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    currentProfile = r.data || null;
  } catch {}
}

function accountName(){
  return nameOf(currentProfile) ||
    currentUser?.user_metadata?.nome ||
    currentUser?.email?.split("@")[0] ||
    "Ouvinte";
}

function updateAccountUI(){
  const name = document.querySelector("[data-account-name]");

  if (name) {
    name.textContent = currentUser ? accountName() : "Entrar";
  }

  const out = document.querySelectorAll("[data-logout]");

  out.forEach(b => {
    b.style.display = currentUser ? "" : "none";
  });
}

function openAccount(){
  const box = document.getElementById("accountPanel");

  if (!box) return;

  if (currentUser) {

    box.innerHTML =
      `<div class="account">` +
      `<img src="${esc(safeUrl(imageOf(currentProfile) || currentUser.user_metadata?.avatar_url || PH))}">` +
      `<div>` +
      `<b>${esc(accountName())}</b>` +
      `<small>${esc(currentUser.email || "")}</small>` +
      `</div>` +
      `</div>` +
      `<button class="btn danger" onclick="logout()">Sair da conta</button>`;

  } else {

    box.innerHTML =
      `<h2>Entrar</h2>` +
      `<label>E-mail<input id="loginEmail" type="email" autocomplete="email"></label>` +
      `<label>Senha<input id="loginPassword" type="password" autocomplete="current-password"></label>` +
      `<div id="authMsg" class="msg"></div>` +
      `<button class="btn primary" onclick="login()">Entrar</button>` +
      `<button class="btn" onclick="signup()">Criar conta</button>`;
  }

  document
    .getElementById("accountOverlay")
    ?.classList.add("open");
}

function closeAccount(){
  document
    .getElementById("accountOverlay")
    ?.classList.remove("open");
}

async function login(){

  const email =
    document.getElementById("loginEmail")?.value.trim();

  const password =
    document.getElementById("loginPassword")?.value || "";

  const msg =
    document.getElementById("authMsg");

  if (!email || !password) {
    if (msg) msg.textContent = "Preencha e-mail e senha.";
    return;
  }

  const r =
    await db.auth.signInWithPassword({
      email,
      password
    });

  if (r.error) {
    if (msg) msg.textContent = r.error.message;
    return;
  }

  currentUser = r.data.user;

  await loadProfile();

  updateAccountUI();

  closeAccount();

  location.reload();
}

async function signup(){

  const email =
    document.getElementById("loginEmail")?.value.trim();

  const password =
    document.getElementById("loginPassword")?.value || "";

  const msg =
    document.getElementById("authMsg");

  if (!email || password.length < 6) {
    if (msg) {
      msg.textContent =
        "Use e-mail e senha com pelo menos 6 caracteres.";
    }

    return;
  }

  const r =
    await db.auth.signUp({
      email,
      password
    });

  if (msg) {
    msg.textContent =
      r.error
        ? r.error.message
        : "Conta criada. Confirme o e-mail se necessário.";
  }
}

async function logout(){

  await db.auth.signOut();

  currentUser = null;
  currentProfile = null;

  closeAccount();

  updateAccountUI();

  location.reload();
}

function toggleOverlay(id){
  document
    .getElementById(id)
    ?.classList.toggle("open");
}

function playMusicById(id, musicCache){

  const m =
    musicCache.find(
      x => String(x.id) === String(id)
    );

  if (!m) return;

  const src = audioOf(m);

  if (!src) {
    alert(
      "Esta música não possui áudio público no banco."
    );

    return;
  }

  document
    .getElementById("ufAudio")
    ?.remove();

  const a =
    document.createElement("audio");

  a.id = "ufAudio";
  a.src = src;
  a.controls = true;
  a.autoplay = true;

  a.style.cssText =
    "position:fixed;left:12px;right:12px;bottom:82px;z-index:999";

  document.body.appendChild(a);

  a.onended = () => a.remove();
}

async function toggleRelation(table, row, active){

  if (!currentUser) {
    openAccount();
    return false;
  }

  try {

    if (active) {

      const r =
        await db
          .from(table)
          .upsert(row);

      if (r.error) throw r.error;

    } else {

      let q =
        db
          .from(table)
          .delete()
          .eq("ouvinte_id", currentUser.id);

      for (const [k,v] of Object.entries(row)) {

        if (k !== "ouvinte_id") {
          q = q.eq(k,v);
        }
      }

      const r = await q;

      if (r.error) throw r.error;
    }

    return true;

  } catch(e) {

    console.warn(
      "Sincronização Supabase:",
      table,
      e
    );

    alert(
      "O Supabase recusou esta ação. Verifique a política RLS da tabela."
    );

    return false;
  }
}

async function getMyIds(table, field){

  if (!currentUser) {
    return new Set();
  }

  const r =
    await db
      .from(table)
      .select(field)
      .eq("ouvinte_id", currentUser.id);

  if (r.error) {
    return new Set();
  }

  return new Set(
    (r.data || [])
      .map(x => String(x[field]))
  );
}

function header(active){

  return `
<header class="top">

<a class="brand" href="index.html">
<span class="mark">💧</span>
<b>Under<span>Fy</span></b>
<i>•</i>
<b>UTA</b>
</a>

<nav>

<a class="${active==="musicas"?"on":""}" href="musicas.html">
Músicas
</a>

<a class="${active==="barras"?"on":""}" href="barras.html">
Barras
</a>

<a class="${active==="stories"?"on":""}" href="stories.html">
Stories
</a>

<a class="${active==="projetos"?"on":""}" href="projetos.html">
Projetos
</a>

</nav>

<button class="account-btn" onclick="openAccount()">
<span data-account-name>Entrar</span> ◯
</button>

</header>`;
}

function footer(){

  return `
<footer>

<a href="index.html">Início</a>

<a href="musicas.html">Músicas</a>

<a href="barras.html">Barras</a>

<a href="stories.html">Stories</a>

<a href="projetos.html">Projetos</a>

</footer>

<div id="accountOverlay"
     class="overlay"
     onclick="if(event.target===this)closeAccount()">

<div class="panel">

<div class="panel-head">

<h2>Conta</h2>

<button onclick="closeAccount()">×</button>

</div>

<div id="accountPanel"></div>

</div>

</div>`;
}

async function bootShared(){

  await loadSession();

  db.auth.onAuthStateChange(
    async (_e, session) => {

      currentUser =
        session?.user || null;

      if (currentUser) {
        await loadProfile();
      } else {
        currentProfile = null;
      }

      updateAccountUI();
    }
  );

  iconRefresh();
}
