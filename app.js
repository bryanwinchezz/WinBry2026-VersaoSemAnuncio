// =================================================================
// SCRIPT.JS - VERSÃO AUTOMÁTICA PROFISSIONAL (CORRIGIDA)
// =================================================================

// ⚠️ CONFIGURAÇÕES
const API_KEY = "55b8ea4272d5e05ac8a517457a4303c4";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const BANNER_BASE = "https://image.tmdb.org/t/p/original";
const LANGUAGE = "&language=pt-BR";

const MOVIE_PLAYER_BASE = "https://playerflixapi.com/filme";
const TV_PLAYER_BASE = "https://playerflixapi.com/serie";

// ⚠️ CONFIGURAÇÕES FIREBASE (Suas Chaves)
const firebaseConfig = {
    apiKey: "AIzaSyAL4eejSiJU7xhg7etuydqlEGq5fGP9hMU",
    authDomain: "winbryplus.firebaseapp.com",
    projectId: "winbryplus",
    storageBucket: "winbryplus.firebasestorage.app",
    messagingSenderId: "754571772845",
    appId: "1:754571772845:web:ab12c0697aa14f35bc1724"
};

// Inicializa Firebase (Verifica se já existe para não dar erro)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Variáveis Globais de Usuário
let currentUser = null; // Usuário logado (Firebase Auth)
let userData = null;    // Dados do banco (Lista, Histórico)

// --- MAPA DAS MARCAS (CORRIGIDO) ---
const BRAND_MAP = {
    // MARVEL: Usa | (ou) para pegar Marvel Studios (420) E Marvel Ent (7505)
    // Isso traz filmes do MCU, séries antigas e animações.
    'marvel': { type: 'company', id: '420|7505|19551', title: 'Universo Marvel' },

    // DC: Soma DC Entertainment (9993) com DC Films (128064)
    'dc': { type: 'company', id: '9993|128064', title: 'Universo DC' },

    // Estúdios e Canais (Mantidos)
    'cartoon': { type: 'network', id: '56', title: 'Cartoon Network' },
    'adult': { type: 'network', id: '80', title: 'Adult Swim' },
    'disney': { type: 'company', id: '2', title: 'Disney' },
    'illumination': { type: 'company', id: '6704', title: 'Illumination' },

    // Sagas Fechadas (Mantidas como Collection pois são sequências diretas)
    'star wars': { type: 'collection', id: '10', title: 'Coleção Star Wars' },
    'invocacao': { type: 'collection', id: '313086', title: 'Coleção Invocação do Mal' },
    'harry potter': { type: 'collection', id: '1241', title: 'Coleção Harry Potter' },
    'jurassic': { type: 'collection', id: '328', title: 'Coleção Jurassic Park' },
    'velozes': { type: 'collection', id: '9485', title: 'Saga Velozes e Furiosos' },
    'jogos': { type: 'collection', id: '131635', title: 'Jogos Vorazes' },
    'crepusculo': { type: 'collection', id: '33514', title: 'Saga Crepúsculo' },
    'transformers': { type: 'collection', id: '8650', title: 'Transformers' }
};

// Variáveis de Controle Global
let currentPage = 1;
let currentType = 'movie';
let currentBrand = null;
let currentSearchQuery = '';
let currentVideoContext = null; // Vai guardar qual filme está aberto no player

// =================================================================
// 1. SISTEMA DE USUÁRIO (AGORA NA NUVEM ☁️)
// =================================================================

auth.onAuthStateChanged(async (user) => {

    // Elementos dos botões flutuantes
    const bryiaBtn = document.getElementById('bryia-fab');
    const surpriseBtn = document.querySelector('.surpreenda-fab');

    if (user) {
        console.log("Usuário conectado:", user.email);
        currentUser = user;

        // --- MOSTRA OS BOTÕES FLUTUANTES ---
        if (bryiaBtn) bryiaBtn.style.display = 'flex';
        if (surpriseBtn) surpriseBtn.style.display = 'flex';

        // Pega os dados do banco (Minha Lista, etc)
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            userData = doc.data();
        } else {
            // Se for novo usuário no banco, cria o documento inicial
            userData = {
                username: user.displayName || "Usuário",
                email: user.email,
                minhaLista: [],
                history: []
            };
            await db.collection('users').doc(user.uid).set(userData);
        }
    } else {
        console.log("Nenhum usuário conectado.");
        currentUser = null;
        userData = null;

        // --- ESCONDE OS BOTÕES FLUTUANTES ---
        if (bryiaBtn) bryiaBtn.style.display = 'none';
        if (surpriseBtn) surpriseBtn.style.display = 'none';
    }

    // Atualiza a interface (Botão de Perfil/Login)
    initHeaderUser();

    // Se estiver na página "Minha Lista" ou "Home", recarrega
    if (window.location.pathname.includes('minha-lista') && typeof initMinhaListaPage === 'function') initMinhaListaPage();
    if (window.location.pathname.includes('index') && typeof loadContinueWatching === 'function') loadContinueWatching();
});

// Helper para salvar dados no banco automaticamente
async function saveUserDataToCloud() {
    if (!currentUser || !userData) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({
            minhaLista: userData.minhaLista,
            history: userData.history,
            profileImage: userData.profileImage || null
        });
    } catch (error) {
        console.error("Erro ao salvar:", error);
    }
}

// =================================================================
// 2. INICIALIZAÇÃO E ROTEAMENTO
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    const userActions = document.querySelector('.user-actions');
    if (userActions) {
        setTimeout(() => {
            userActions.style.opacity = '1';
            userActions.style.visibility = 'visible';
        }, 100);
    }

    initGlobalLoader();
    initTheme();
    initMenuMobile();
    initSearch();
    initVideoModal();
    initHeaderUser();
    initTransitionManager();
    initSaveButton();
    loadContinueWatching();
    initEsqueciSenha();

    if (document.getElementById("cadastroForm")) initCadastro(document.getElementById("cadastroForm"));
    if (document.getElementById("loginForm")) initLogin(document.getElementById("loginForm"));
    if (document.querySelector('.account-info-card')) initMinhaConta();

    // Roteamento
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    const id = params.get('id');
    const type = params.get('type');

    // Verifica se veio do botão da Home (Hubs como Marvel, DC)
    const isHub = params.get('global') === 'true';

    // AQUI ESTÁ A CORREÇÃO: Removemos o ".html" das verificações
    if (path.includes('detalhes')) {
        if (id && type) loadDetails(type, id);
    }
    else if (path.includes('filmes')) {
        currentType = 'movie';
        if (search) handleSearchRouting(search, 'movie', isHub);
        else loadCatalog('movie', 1);
    }
    else if (path.includes('series')) {
        currentType = 'tv';
        if (search) loadSearch(search, 'tv', 1);
        else loadCatalog('tv', 1);
    }
    else if (path.includes('animes')) {
        currentType = 'anime';
        if (search) loadSearch(search, 'tv', 1);
        else loadAnimes(1);
    }
    else if (path.includes('minha-lista')) {
        initMinhaListaPage();
    }
    else if (path.includes('index') || path === '/' || path.endsWith('/')) {
        loadHome();
    }
});

// Função atualizada para diferenciar CLIQUE (Hub) de DIGITAÇÃO (Pesquisa)
function handleSearchRouting(query, defaultType, isHub) {
    const brandKey = query.toLowerCase();

    // Só carrega o layout especial da marca se:
    // 1. A marca existe no mapa (BRAND_MAP)
    // 2. E veio através de um clique no Hub (isHub é verdadeiro)
    if (isHub && BRAND_MAP[brandKey]) {
        currentType = 'brand';
        currentBrand = brandKey;
        loadBrandContent(brandKey, 1);
    } else {
        // Caso contrário (digitou na barra), faz uma pesquisa de texto normal
        currentType = 'search';
        currentSearchQuery = query;
        loadSearch(query, defaultType, 1);
    }
}

// =================================================================
// 3. INTEGRAÇÃO TMDB & LÓGICA DE CONTEÚDO
// =================================================================

async function fetchTMDB(endpoint) {
    try {
        const char = endpoint.includes('?') ? '&' : '?';
        const response = await fetch(`${BASE_URL}${endpoint}${char}api_key=${API_KEY}${LANGUAGE}`);
        return await response.json();
    } catch (error) { console.error("Erro TMDB:", error); return null; }
}

// =================================================================
// ATUALIZAÇÃO DA HOME (Misto de Filmes e Séries)
// =================================================================

async function loadHome() {
    console.log("Iniciando carregamento da Home...");

    // 1. Destaque Principal + Top 10 (MISTO)
    // Usamos o endpoint /trending/all/day para pegar o que está bombando HOJE (Filmes + Séries)
    const trendingMixed = await fetchTMDB('/trending/all/day');

    if (trendingMixed && trendingMixed.results) {
        // --- MUDANÇA AQUI: Pega os 5 primeiros para o Banner Rotativo ---
        const top5 = trendingMixed.results.slice(0, 5);
        initHeroCarousel(top5);

        // O Top 10 pega os 10 primeiros misturados
        renderTop10('top10-section', 'Top 10 no Brasil Hoje', trendingMixed.results.slice(0, 10));
    }

    // 2. Carregar Categorias
    loadCategoriesCarousel();

    // 3. Filmes Populares (Mantivemos separado para quem quer só filme)
    const popularMovies = await fetchTMDB('/movie/popular');
    if (popularMovies && popularMovies.results) {
        renderCarousel('filmes-populares-section', 'Filmes Populares', popularMovies.results, 'movie');
    }

    // 4. Em Breve (MISTO - Já vamos conferir a função abaixo)
    loadUnlimitedUpcoming();

    // 5. Séries em Alta (Mantivemos separado para quem quer só série)
    const series = await fetchTMDB('/trending/tv/week');
    if (series && series.results) renderCarousel('series-em-alta-section', 'Séries em Alta', series.results, 'tv');

    // 6. Animes
    const animes = await fetchTMDB('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc');
    if (animes && animes.results) renderCarousel('animes-recomendados-section', 'Animes Recomendados', animes.results, 'tv');
}

// --- NOVA FUNÇÃO: CATEGORIAS COM SETAS E MAIS OPÇÕES ---
async function loadCategoriesCarousel() {
    const sectionId = 'categorias-section';
    const container = document.getElementById(sectionId);
    if (!container) return;

    // Estrutura do Carrossel
    container.querySelector('.container').innerHTML = `
        <h2>Navegar por Categorias</h2>
        <div class="carousel-wrapper">
            <button class="carousel-btn prev"><i class="fas fa-chevron-left"></i></button>
            <div class="carousel" id="cat-carousel-inner"></div>
            <button class="carousel-btn next"><i class="fas fa-chevron-right"></i></button>
        </div>
    `;

    const carouselInner = document.getElementById('cat-carousel-inner');
    const btnPrev = container.querySelector('.prev');
    const btnNext = container.querySelector('.next');

    // Lista Expandida de Categorias
    const categorias = [
        { id: 28, name: 'Ação', type: 'movie' },
        { id: 12, name: 'Aventura', type: 'movie' },
        { id: 16, name: 'Animes', type: 'tv' }, // Anime é TV geralmente
        { id: 35, name: 'Comédia', type: 'movie' },
        { id: 80, name: 'Crime', type: 'movie' },
        { id: 99, name: 'Documentário', type: 'movie' },
        { id: 18, name: 'Drama', type: 'movie' },
        { id: 10751, name: 'Família', type: 'movie' },
        { id: 14, name: 'Fantasia', type: 'movie' },
        { id: 36, name: 'História', type: 'movie' },
        { id: 27, name: 'Terror', type: 'movie' },
        { id: 10402, name: 'Música', type: 'movie' },
        { id: 9648, name: 'Mistério', type: 'movie' },
        { id: 10749, name: 'Romance', type: 'movie' },
        { id: 878, name: 'Ficção Científica', type: 'movie' },
        { id: 10752, name: 'Guerra', type: 'movie' },
        { id: 37, name: 'Faroeste', type: 'movie' }
    ];

    let html = '';

    // 1. Criamos um conjunto externo para guardar os IDs dos filmes já usados
    const usedIds = new Set();

    // Carregamento paralelo
    const promessas = categorias.map(async (cat) => {
        // Pega os filmes da categoria
        const data = await fetchTMDB(`/discover/${cat.type}?with_genres=${cat.id}&sort_by=popularity.desc&page=1`);
        const results = (data && data.results) ? data.results : [];

        // 2. Lógica de Seleção Única:
        // Procura na lista o primeiro filme que tenha imagem E que ainda não esteja no conjunto 'usedIds'
        let selectedItem = results.find(item => item.backdrop_path && !usedIds.has(item.id));

        // Fallback: Se não achou nenhum único (raro) ou a lista acabou, pega um aleatório dos top 10 para variar
        if (!selectedItem && results.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(10, results.length));
            selectedItem = results[randomIndex];
        }

        // 3. Adiciona o ID escolhido ao conjunto para não ser usado na próxima categoria
        if (selectedItem) {
            usedIds.add(selectedItem.id);
        }

        // Define o background usando o item escolhido
        const bg = (selectedItem && selectedItem.backdrop_path)
            ? `https://image.tmdb.org/t/p/w500${selectedItem.backdrop_path}`
            : 'images/banner-filme.jpg';

        return `
        <a href="${cat.type === 'tv' ? 'animes.html' : 'filmes.html'}?search=${cat.name}" class="category-card">
            <img src="${bg}" loading="lazy" alt="${cat.name}">
            <div class="category-overlay">
                <h3>${cat.name}</h3>
            </div>
        </a>`;
    });

    const resultados = await Promise.all(promessas);
    carouselInner.innerHTML = resultados.join('');

    // Ativa os botões
    btnPrev.onclick = () => carouselInner.scrollBy({ left: -400, behavior: 'smooth' });
    btnNext.onclick = () => carouselInner.scrollBy({ left: 400, behavior: 'smooth' });
}

// --- FUNÇÃO: EM BREVE MISTO (FILMES E SÉRIES) ---
async function loadUnlimitedUpcoming() {
    const sectionId = 'em-breve-section';
    const section = document.getElementById(sectionId);
    if (!section) return;

    const hoje = new Date().toISOString().split('T')[0];
    const fimFuturo = '2026-12-31'; // Define até onde buscar

    // 1. Busca FILMES futuros
    const reqMovies = fetchTMDB(`/discover/movie?primary_release_date.gte=${hoje}&primary_release_date.lte=${fimFuturo}&sort_by=popularity.desc&page=1`);

    // 2. Busca SÉRIES futuras (Novas temporadas ou estreias)
    const reqTV = fetchTMDB(`/discover/tv?first_air_date.gte=${hoje}&first_air_date.lte=${fimFuturo}&sort_by=popularity.desc&page=1`);

    const [resMovies, resTV] = await Promise.all([reqMovies, reqTV]);

    // 3. Combina e normaliza os dados
    let combinados = [];

    if (resMovies && resMovies.results) {
        combinados = [...combinados, ...resMovies.results.map(i => ({
            ...i,
            media_type: 'movie',
            date_sort: i.release_date // Cria campo comum para ordenar
        }))];
    }

    if (resTV && resTV.results) {
        combinados = [...combinados, ...resTV.results.map(i => ({
            ...i,
            media_type: 'tv',
            date_sort: i.first_air_date // Cria campo comum para ordenar
        }))];
    }

    // 4. Ordena por DATA (do mais próximo para o mais distante)
    combinados.sort((a, b) => new Date(a.date_sort) - new Date(b.date_sort));

    // Filtra duplicados e itens sem imagem
    combinados = combinados.filter((item, index, self) =>
        item.poster_path &&
        index === self.findIndex((t) => (t.id === item.id))
    );

    const container = section.querySelector('.container');
    container.innerHTML = `<h2>Em Breve</h2>`;

    const wrapper = document.createElement('div');
    wrapper.className = 'carousel-wrapper';

    const prev = document.createElement('button');
    prev.className = 'carousel-btn prev';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';

    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    const next = document.createElement('button');
    next.className = 'carousel-btn next';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';

    let htmlAcumulado = ''; // 1. Cria variável

    combinados.forEach(item => {
        let dataFormatada = "EM BREVE";
        if (item.date_sort) {
            const [ano, mes, dia] = item.date_sort.split('-');
            dataFormatada = `${dia}/${mes}`;
        }

        const poster = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        const titulo = item.title || item.name;

        // Badge diferenciado (opcional, mas ajuda a saber se é série ou filme)
        const typeLabel = item.media_type === 'tv' ? 'SÉRIE' : 'FILME';

        htmlAcumulado += `
    <a href="detalhes.html?id=${item.id}&type=${item.media_type}" class="content-card upcoming-card">
        <div style="position: relative; width: 100%; height: 100%;">
            <img src="${poster}" alt="${titulo}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
            <div class="date-badge">${dataFormatada}</div>
        </div>
    </a>`;
    });

    // 3. Joga na tela UMA VEZ SÓ no final do loop
    carousel.innerHTML = htmlAcumulado;

    prev.onclick = () => carousel.scrollBy({ left: -300, behavior: 'smooth' });
    next.onclick = () => carousel.scrollBy({ left: 300, behavior: 'smooth' });

    wrapper.append(prev, carousel, next);
    container.appendChild(wrapper);
}

// --- FUNÇÃO TOP 10 CORRIGIDA (Layout Bonito) ---
function renderTop10(sectionId, title, items) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const container = section.querySelector('.container');
    container.innerHTML = `<h2>${title}</h2>`;

    const wrapper = document.createElement('div');
    wrapper.className = 'carousel-wrapper top10-wrapper';

    const prev = document.createElement('button');
    prev.className = 'carousel-btn prev';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';

    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    const next = document.createElement('button');
    next.className = 'carousel-btn next';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';

    items.forEach((item, index) => {
        const rank = index + 1;
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'images/favicon.png';
        const link = `detalhes.html?id=${item.id}&type=${item.media_type || 'movie'}`;

        const html = `
        <div class="top10-card-container">
            <span class="rank-number">${rank}</span>
            <a href="${link}" class="content-card">
                <img src="${poster}" alt="${item.title}" loading="lazy">
            </a>
        </div>`;
        carousel.innerHTML += html;
    });

    prev.onclick = () => carousel.scrollBy({ left: -300, behavior: 'smooth' });
    next.onclick = () => carousel.scrollBy({ left: 300, behavior: 'smooth' });

    wrapper.append(prev, carousel, next);
    container.appendChild(wrapper);
}

// --- FUNÇÃO EM BREVE (Com Setas e Tamanho Normal) ---
function renderUpcomingCarousel(sectionId, title, items) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const container = section.querySelector('.container');
    container.innerHTML = `<h2>${title}</h2>`;

    const wrapper = document.createElement('div');
    wrapper.className = 'carousel-wrapper';

    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    items.forEach(item => {
        let dataFormatada = "EM BREVE";
        if (item.release_date) {
            const parts = item.release_date.split('-');
            dataFormatada = `${parts[2]}/${parts[1]}`;
        }
        const poster = item.poster_path ? `${IMG_BASE}${item.poster_path}` : 'images/favicon.png';

        // Removemos o style inline de margin-right e usamos classe CSS
        const html = `
        <a href="detalhes.html?id=${item.id}&type=movie" class="content-card upcoming-card">
            <div style="position: relative; width: 100%; height: 100%;">
                <img src="${poster}" alt="${item.title}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
                <div class="date-badge">ESTREIA: ${dataFormatada}</div>
            </div>
        </a>`;
        carousel.innerHTML += html;
    });

    // --- ADICIONANDO AS SETAS ---
    const prev = document.createElement('button');
    prev.className = 'carousel-btn prev';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.onclick = () => carousel.scrollBy({ left: -300, behavior: 'smooth' });

    const next = document.createElement('button');
    next.className = 'carousel-btn next';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.onclick = () => carousel.scrollBy({ left: 300, behavior: 'smooth' });

    wrapper.appendChild(prev);
    wrapper.appendChild(carousel);
    wrapper.appendChild(next);
    container.appendChild(wrapper);
}

// --- FUNÇÕES DE CARREGAMENTO (COM TRAVA DE 500 PÁGINAS) ---

async function loadCatalog(type, page) {
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const endpoint = `/discover/${type}?sort_by=popularity.desc&include_adult=false&page=${page}`;
    const data = await fetchTMDB(endpoint);

    const titulo = type === 'movie' ? 'Filmes' : 'Séries';

    // TRAVA DE SEGURANÇA: API do TMDB limita a 500 páginas para acesso público
    const totalPages = Math.min(data.total_pages, 500);

    renderGrid(data.results, type, titulo);
    renderPagination(totalPages, page, (p) => loadCatalog(type, p));
}

async function loadAnimes(page) {
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const endpoint = `/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&include_adult=false&page=${page}`;
    const data = await fetchTMDB(endpoint);

    const totalPages = Math.min(data.total_pages, 500);

    renderGrid(data.results, 'tv', 'Animes');
    renderPagination(totalPages, page, (p) => loadAnimes(p));
}

async function loadSearch(query, type, page) {
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const endpoint = `/search/${type}?query=${encodeURIComponent(query)}&page=${page}`;
    const data = await fetchTMDB(endpoint);

    const totalPages = Math.min(data.total_pages, 500);

    renderGrid(data.results, type, `Busca: "${query}"`);
    renderPagination(totalPages, page, (p) => loadSearch(query, type, p));
}

async function loadBrandContent(key, page) {
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const brand = BRAND_MAP[key];
    if (!brand) return;

    // Lógica Especial para Coleções (Sagas)
    if (brand.type === 'collection') {
        // Coleções não têm paginação no TMDB, elas retornam tudo de uma vez
        const endpoint = `/collection/${brand.id}`;
        const data = await fetchTMDB(endpoint);

        if (data && data.parts) {
            // Filtra apenas os que têm poster e ordena por lançamento (opcional)
            const filmes = data.parts.filter(m => m.poster_path);

            // Renderiza tudo e esconde a paginação (passa 1 de 1)
            renderGrid(filmes, 'movie', brand.title);
            renderPagination(1, 1, null);
        }
        return;
    }

    // Lógica Padrão para Empresas e Keywords
    let endpoint = '';
    if (brand.type === 'company') endpoint = `/discover/movie?with_companies=${brand.id}&sort_by=popularity.desc&include_adult=false&page=${page}`;
    else if (brand.type === 'network') endpoint = `/discover/tv?with_networks=${brand.id}&sort_by=popularity.desc&include_adult=false&page=${page}`;
    else if (brand.type === 'keyword') endpoint = `/discover/movie?with_keywords=${brand.id}&sort_by=popularity.desc&include_adult=false&page=${page}`;

    const data = await fetchTMDB(endpoint);

    // Trava de 500 páginas do TMDB
    const totalPages = Math.min(data.total_pages, 500);
    const mediaType = brand.type === 'network' ? 'tv' : 'movie';

    renderGrid(data.results, mediaType, brand.title);
    renderPagination(totalPages, page, (p) => loadBrandContent(key, p));
}

// =================================================================
// 4. RENDERIZAÇÃO E PAGINAÇÃO ESTÁTICA
// =================================================================

function renderGrid(items, type, title) {
    const container = document.getElementById('content-grid');
    if (!container) return;

    container.innerHTML = `<h1>${title}</h1><div class="content-grid" id="grid-items"></div>`;
    const gridItems = document.getElementById('grid-items');

    if (!items || items.length === 0) {
        gridItems.innerHTML = '<p class="empty-state">Nenhum resultado encontrado.</p>';
        return;
    }

    let html = '';
    items.forEach(item => {
        html += createCardHTML(item, type);
    });
    gridItems.innerHTML = html;
}

function createCardHTML(item, typeOverride) {
    const type = typeOverride || item.media_type || 'movie';
    const poster = item.poster_path ? `${IMG_BASE}${item.poster_path}` : 'images/favicon.png';
    const titulo = item.title || item.name;
    const ano = (item.release_date || item.first_air_date || '????').substring(0, 4);

    return `
    <a href="detalhes.html?id=${item.id}&type=${type}" class="content-card">
        <img src="${poster}" alt="${titulo}" loading="lazy">
        <div class="card-info">
            <h3>${titulo}</h3>
            <p>${ano}</p>
        </div>
    </a>`;
}

// --- PAGINAÇÃO CORRIGIDA (ESTÁTICA E LIMITADA A 500) ---
function renderPagination(totalPages, currentPage, callback) {
    const container = document.getElementById('content-grid');

    const oldPag = document.querySelector('.pagination-container');
    if (oldPag) oldPag.remove();

    if (totalPages <= 1) return;

    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-container';

    // Botão Anterior
    const prevBtn = createPageButton('<i class="fas fa-chevron-left"></i>', () => callback(currentPage - 1));
    if (currentPage === 1) prevBtn.disabled = true;
    paginationDiv.appendChild(prevBtn);

    // Lógica para mostrar números (1 ... 4 5 6 ... 500)
    // Isso mantêm a barra estável

    let pagesToShow = [];

    if (totalPages <= 7) {
        // Se tem poucas páginas, mostra todas
        for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
    } else {
        // Sempre mostra a primeira
        pagesToShow.push(1);

        if (currentPage > 3) {
            pagesToShow.push('...');
        }

        // Calcula intervalo ao redor da página atual
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        // Ajuste para não quebrar nos cantos
        if (currentPage <= 3) { end = 4; }
        if (currentPage >= totalPages - 2) { start = totalPages - 3; }

        for (let i = start; i <= end; i++) {
            if (i > 1 && i < totalPages) pagesToShow.push(i);
        }

        if (currentPage < totalPages - 2) {
            pagesToShow.push('...');
        }

        // Sempre mostra a última (Máximo 500)
        pagesToShow.push(totalPages);
    }

    // Renderiza os botões calculados
    pagesToShow.forEach(p => {
        if (p === '...') {
            paginationDiv.appendChild(createEllipsis());
        } else {
            const btn = createPageButton(p, () => callback(p));
            if (p === currentPage) btn.classList.add('active');
            paginationDiv.appendChild(btn);
        }
    });

    // Botão Próximo
    const nextBtn = createPageButton('<i class="fas fa-chevron-right"></i>', () => callback(currentPage + 1));
    if (currentPage >= totalPages) nextBtn.disabled = true;
    paginationDiv.appendChild(nextBtn);

    container.parentNode.appendChild(paginationDiv);
}

function createPageButton(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'page-btn';
    btn.innerHTML = text;
    btn.onclick = onClick;
    return btn;
}

function createEllipsis() {
    const span = document.createElement('span');
    span.innerText = '...';
    span.style.color = '#fff';
    span.style.padding = '0 5px';
    return span;
}

// =================================================================
// 5. DETALHES, CARROSSEL E HELPERS
// =================================================================

async function loadDetails(type, id) {
    const item = await fetchTMDB(`/${type}/${id}`);
    if (!item) return;
    const externalIds = await fetchTMDB(`/${type}/${id}/external_ids`);
    const imdbId = externalIds ? externalIds.imdb_id : null;

    let classificacao = "L";

    if (type === 'movie') {
        // Lógica para FILMES
        const releases = await fetchTMDB(`/movie/${id}/release_dates`);
        if (releases && releases.results) {
            const br = releases.results.find(r => r.iso_3166_1 === 'BR');
            if (br && br.release_dates) {
                const cert = br.release_dates.find(d => d.certification);
                if (cert) classificacao = cert.certification;
            }
        }
    } else {
        // Lógica para SÉRIES (Corrigido erro de variável)
        const ratings = await fetchTMDB(`/tv/${id}/content_ratings`);

        // Antes você usava "releases" aqui, o que dava erro. Agora está "ratings".
        if (ratings && ratings.results) {
            const br = ratings.results.find(r => r.iso_3166_1 === 'BR');
            if (br) classificacao = br.rating;
        }
    }

    const corClass = getRatingColor(parseInt(classificacao) || 0, classificacao);

    const bg = item.backdrop_path ? `${BANNER_BASE}${item.backdrop_path}` : 'images/banner-filme.jpg';
    const poster = item.poster_path ? `${IMG_BASE}${item.poster_path}` : 'images/favicon.png';
    const titulo = item.title || item.name;
    const ano = (item.release_date || item.first_air_date || '????').substring(0, 4);
    const nota = item.vote_average.toFixed(1);
    const duracaoTxt = formatDuration(item.runtime, item.number_of_seasons);

    // --- LÓGICA DO LER MAIS ---
    const sinopseTexto = item.overview || "Sinopse não disponível.";
    const isLongText = sinopseTexto.length > 150;
    const sinopseHtml = `
        <p class="synopsis-text ${isLongText ? 'clamped' : ''}" id="synopsis-content">${sinopseTexto}</p>
        ${isLongText ? '<button id="btn-read-more" class="btn-read-more">Ler mais</button>' : ''}
    `;

    const container = document.getElementById('details-container');
    if (container) {
        container.innerHTML = `
        <div class="details-header" style="background-image: url('${bg}');">
            <div class="overlay"></div>
            <div class="details-info container">
                <div class="details-poster">
                    <img src="${poster}" alt="${titulo}" style="view-transition-name: poster-morph;">
                </div>
                <div class="info-text">
                    <h1>${titulo}</h1>
                    <div class="star-rating" style="color:#ffd700; font-size:1.2rem; margin:10px 0;">
                        <i class="fas fa-star"></i> ${nota} 
                    </div>
                    <div class="meta-info">
                        <span class="classificacao" style="background-color:${corClass}; padding: 4px 8px; border-radius:4px; font-weight:bold; color:white;">${classificacao}</span>
                        <span>${ano}</span>
                        <span>${duracaoTxt}</span>
                        <span class="qualidade">HD</span>
                    </div>
                    
                    ${sinopseHtml} 
                    <div class="actions">
                        <button class="btn btn-play" id="btn-assistir-detalhes"><i class="fas fa-play"></i> Assistir</button>
                        <button class="btn btn-lista" id="btn-add-lista"><i class="fas fa-bookmark"></i> Minha Lista</button>
                    </div>
                    ${item.genres ? `<div class="elenco" style="margin-top:10px; color:#ccc;"><strong>Gêneros:</strong> ${item.genres.map(g => g.name).join(', ')}</div>` : ''}
                </div>
            </div>
        </div>`;
    }

    // --- REATIVA OS BOTÕES (Ler Mais, Assistir, Lista) ---
    const btnReadMore = document.getElementById('btn-read-more');
    if (btnReadMore) {
        btnReadMore.addEventListener('click', () => {
            const textEl = document.getElementById('synopsis-content');
            const isClamped = textEl.classList.contains('clamped');

            if (isClamped) {
                textEl.classList.remove('clamped');
                textEl.classList.add('expanded');
                btnReadMore.innerText = "Ler menos";
            } else {
                textEl.classList.remove('expanded');
                textEl.classList.add('clamped');
                btnReadMore.innerText = "Ler mais";
            }
        });
    }

    const btnAssistir = document.getElementById('btn-assistir-detalhes');
    if (btnAssistir) {
        btnAssistir.addEventListener('click', () => {
            // Abre Anúncio
            window.open("https://ballisticcomainvitation.com/x2wn9r0ndf?key=122b6ab9ee80122daefb717fe00bd58f", "_blank");

            // Salva Progresso
            setupSaveProgress({
                id: item.id,
                type: type,
                titulo: titulo,
                poster: poster
            });

            // Abre Player
            let videoUrl = (type === 'movie') ? `${MOVIE_PLAYER_BASE}/${imdbId || id}` : `${TV_PLAYER_BASE}/${id}`;
            openVideoModal(videoUrl);
        });
    }

    const btnLista = document.getElementById('btn-add-lista');
    if (btnLista) {
        updateListaButton(btnLista, id);
        btnLista.addEventListener('click', () => toggleMinhaLista({ id, type, titulo, poster, ano }, btnLista));
    }
}

function setupHeroBanner(item) {
    const bannerImg = document.querySelector('.banner-img');
    const heroTitle = document.querySelector('.hero-content h1');
    const heroDesc = document.querySelector('.hero-content p');
    const heroLink = document.querySelector('.hero-content .btn-info');
    const heroBtn = document.getElementById('btn-open-player');

    // Detecta se é filme ou série (o endpoint 'trending/all' traz essa info)
    const type = item.media_type || 'movie';

    if (bannerImg) bannerImg.src = `${BANNER_BASE}${item.backdrop_path}`;
    if (heroTitle) heroTitle.innerText = item.title || item.name;
    if (heroDesc) heroDesc.innerText = item.overview ? item.overview.substring(0, 150) + "..." : "";

    // Link "Mais Informações" corrigido com o tipo certo
    if (heroLink) heroLink.href = `detalhes.html?id=${item.id}&type=${type}`;

    if (heroBtn) {
        heroBtn.onclick = () => {
            fetchTMDB(`/${type}/${item.id}/external_ids`).then(ids => {
                const playId = ids.imdb_id || item.id;
                // Define a URL base correta dependendo do tipo
                const playerBase = (type === 'tv') ? TV_PLAYER_BASE : MOVIE_PLAYER_BASE;
                openVideoModal(`${playerBase}/${playId}`);
            });
        };
    }
}

function renderCarousel(sectionId, title, items, type) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const container = section.querySelector('.container');

    // 1. Limpa e coloca o título
    container.innerHTML = `<h2>${title}</h2>`;

    const wrapper = document.createElement('div');
    wrapper.className = 'carousel-wrapper';

    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    // --- A CORREÇÃO MÁGICA AQUI ---
    // Criamos uma variável na memória para guardar todo o HTML
    let htmlAcumulado = '';

    items.forEach(item => {
        // Soma o HTML na variável (super rápido)
        htmlAcumulado += createCardHTML(item, type);
    });

    // Joga na tela UMA VEZ SÓ (a TV agradece!)
    carousel.innerHTML = htmlAcumulado;
    // -----------------------------

    // Botões de Navegação
    const prev = document.createElement('button');
    prev.className = 'carousel-btn prev';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.onclick = () => carousel.scrollBy({ left: -300, behavior: 'smooth' });

    const next = document.createElement('button');
    next.className = 'carousel-btn next';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.onclick = () => carousel.scrollBy({ left: 300, behavior: 'smooth' });

    wrapper.append(prev, carousel, next);
    container.appendChild(wrapper);
}

// --- HELPER FUNCTIONS ---

function formatDuration(minutes, seasons) {
    if (seasons) return seasons + (seasons === 1 ? " Temporada" : " Temporadas");
    if (!minutes) return "N/A";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}min`;
}

function getRatingColor(num, str) {
    if (str === 'L' || num === 0) return '#2ecc71';
    if (num >= 18) return '#000000';
    if (num >= 16) return '#db0000';
    if (num >= 14) return '#e67e22';
    if (num >= 12) return '#f1c40f';
    if (num >= 10) return '#0c94e2';
    return '#2ecc71';
}

function showToast(message, type = 'info') {
    const existingToast = document.getElementById('active-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'active-toast';
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initTransitionManager() {
    if (!document.startViewTransition) return;

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        if (link.href.includes('detalhes')) {
            const img = link.querySelector('img');
            if (img) img.style.viewTransitionName = 'poster-morph';
        }
    });
}

// =================================================================
// LOGIN COM GOOGLE
// ================================================================

function initGoogleLogin() {
    const btn = document.getElementById('btn-google-login');
    if (!btn) return;

    btn.onclick = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();

        try {
            showToast("Conectando ao Google...", "info");

            // Abre o Popup do Google
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Verifica/Cria usuário no Banco
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                await db.collection('users').doc(user.uid).set({
                    username: user.displayName,
                    email: user.email,
                    profileImage: user.photoURL,
                    minhaLista: [],
                    history: []
                });
                showToast("Conta criada! Redirecionando...", "success");
            } else {
                showToast(`Bem-vindo, ${user.displayName}!`, "success");
            }

            // Animação de saída antes de redirecionar
            const box = document.querySelector('.auth-box');
            if (box) box.style.transform = "scale(0.9) translateY(-20px)";
            if (box) box.style.opacity = "0";

            setTimeout(() => window.location.href = 'index.html', 1500);

        } catch (error) {
            console.error("ERRO DETALHADO GOOGLE:", error);

            // TRADUÇÃO DE ERROS COMUNS DO GOOGLE AUTH
            let msg = "Erro ao entrar com Google.";

            if (error.code === 'auth/popup-closed-by-user') {
                msg = "Você fechou a janela do Google antes de terminar.";
            } else if (error.code === 'auth/cancelled-popup-request') {
                msg = "Muitas janelas abertas. Tente de novo.";
            } else if (error.code === 'auth/popup-blocked') {
                msg = "O navegador bloqueou o Popup. Permita popups para este site.";
            } else if (error.code === 'auth/unauthorized-domain') {
                msg = "Domínio não autorizado no Firebase. Configure no Console.";
            } else if (error.code === 'auth/operation-not-allowed') {
                msg = "Login Google não está ativado no painel do Firebase.";
            }

            showToast(msg, "error");
        }
    };
}

function initMinhaConta() {
    console.log("Iniciando Minha Conta...");

    // FUNÇÃO INTERNA: Atualiza a tela com os dados reais
    const updateUI = () => {
        if (currentUser && userData) {
            const nomeEl = document.getElementById('display-username');
            const emailEl = document.getElementById('display-email');
            const imgEl = document.getElementById('profile-pic');

            if (nomeEl) nomeEl.innerText = userData.username || currentUser.displayName || "Usuário";
            if (emailEl) emailEl.innerText = currentUser.email || "";
            // Foto vem do Google ou do Upload local (prioridade para local se houver, senão Google)
            if (imgEl) imgEl.src = userData.profileImage || currentUser.photoURL || 'images/foto-generica.jpg';
        }
    };

    updateUI();

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user; // Atualiza global
            setTimeout(updateUI, 500);
        }
    });

    // --- LÓGICA DE BOTÕES ---

    // Sair
    const btnLogout = document.querySelector('.btn-logout');
    if (btnLogout) {
        btnLogout.onclick = () => {
            auth.signOut();
            showToast("Saiu da conta.", "info");
            setTimeout(() => window.location.href = 'login.html', 1000);
        };
    }

    // Upload de Foto (Opcional, pois Google já traz foto)
    const upload = document.getElementById('upload-pic');
    if (upload) upload.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result;
                // Salva no Firestore
                userData.profileImage = base64;
                await db.collection('users').doc(currentUser.uid).update({
                    profileImage: base64
                });
                updateUI();
                initHeaderUser();
                showToast("Foto atualizada!", "success");
            };
            reader.readAsDataURL(file);
        }
    };

    // --- MODAL: EDITAR PERFIL (APENAS NOME) ---
    const btnEdit = document.getElementById('btn-edit-profile');
    const modal = document.getElementById('edit-profile-modal');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const formEdit = document.getElementById('editProfileForm');

    if (btnEdit && modal) {
        // ABRIR POP-UP
        btnEdit.onclick = () => {
            // Preenche apenas o nome
            // Removemos o ?. e usamos verificação segura
            const nomeSalvo = (userData && userData.username) ? userData.username : "";
            document.getElementById('edit-name').value = nomeSalvo || currentUser.displayName || "";
            modal.classList.add('active');
        };

        // FECHAR POP-UP
        btnCancel.onclick = () => modal.classList.remove('active');

        // SALVAR DADOS
        formEdit.onsubmit = async (e) => {
            e.preventDefault();

            const newName = document.getElementById('edit-name').value.trim();

            if (newName === (userData.username || currentUser.displayName)) {
                return showToast("Nenhuma alteração detectada.", "info");
            }

            showToast("Atualizando perfil...", "info");

            try {
                // 1. Atualiza no Banco de Dados
                await db.collection('users').doc(currentUser.uid).update({
                    username: newName
                });

                // 2. Tenta atualizar no Auth do Google (apenas visual local)
                try { await currentUser.updateProfile({ displayName: newName }); } catch (err) { console.log("Info: Auth profile update skipped"); }

                // 3. Atualização Local
                userData.username = newName;

                updateUI();
                initHeaderUser(); // Atualiza o topo do site também
                modal.classList.remove('active');

                showToast("Nome atualizado com sucesso!", "success");

            } catch (error) {
                console.error("Erro ao atualizar:", error);
                showToast("Erro ao salvar alterações.", "error");
            }
        };
    }
}

function initHeaderUser() {
    const btn = document.getElementById('user-action');
    if (!btn) return;
    if (currentUser) {
        // Verifica se userData existe antes de pegar a foto
        const img = (userData && userData.profileImage) ? userData.profileImage : 'images/favicon.png';

        // Verifica se userData existe antes de pegar o nome e fazer o split
        const nome = (userData && userData.username) ? userData.username.split(' ')[0] : 'Perfil';
        btn.innerHTML = `<img src="${img}" style="width:28px;height:28px;border-radius:50%;margin-right:8px;object-fit:cover;"> ${nome}`;
        btn.href = 'minha-conta.html';
        btn.classList.remove('btn-primary');
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
    } else {
        btn.innerHTML = 'Entrar';
        btn.href = 'login.html';
        btn.classList.add('btn-primary');
        btn.style.display = '';
    }
}

function initSearch() {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-icon');
    const searchBox = document.querySelector('.search-box');

    // Função para abrir/fechar
    const toggleSearch = () => {
        searchBox.classList.toggle('active'); // Adiciona/Remove classe 'active'

        if (searchBox.classList.contains('active')) {
            input.style.display = 'block'; // Garante que o input apareça
            setTimeout(() => input.focus(), 100); // Foca para digitar
        } else {
            setTimeout(() => { input.style.display = 'none'; }, 300); // Esconde depois da animação
        }
    };

    // Função de pesquisar (Enter ou clicar na lupa se já estiver aberto)
    const go = () => {
        if (input.value) {
            const path = window.location.pathname;
            let targetPage = 'filmes.html';
            if (path.includes('series')) targetPage = 'series.html';
            else if (path.includes('animes')) targetPage = 'animes.html';

            window.location.href = `${targetPage}?search=${encodeURIComponent(input.value)}`;
        }
    };

    if (btn) {
        btn.onclick = (e) => {
            // Se for mobile, alterna a barra. Se for PC, mantém comportamento padrão
            if (window.innerWidth <= 768) {
                // Se já estiver aberto e tiver texto, pesquisa. Senão, alterna.
                if (searchBox.classList.contains('active') && input.value) {
                    go();
                } else {
                    toggleSearch();
                }
            } else {
                go();
            }
        };
    }

    if (input) {
        input.onkeypress = (e) => { if (e.key === 'Enter') go(); };
    }
}

function openVideoModal(url) {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-iframe');
    if (modal && iframe) { iframe.src = url; modal.classList.add('show'); }
}
function initVideoModal() {
    const modal = document.getElementById('video-modal');
    const close = document.getElementById('close-player');
    const iframe = document.getElementById('video-iframe');
    if (close) close.onclick = () => { modal.classList.remove('show'); iframe.src = ''; };
    if (modal) modal.onclick = (e) => { if (e.target === modal) { modal.classList.remove('show'); iframe.src = ''; } };
}
function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.onclick = () => { document.body.classList.toggle('light-mode'); localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); };
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
}
function initMenuMobile() {
    const btn = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.main-nav ul');
    if (btn && nav) btn.onclick = () => nav.classList.toggle('active');
}

// =================================================================
// 6. LÓGICA DE CONTINUAR ASSISTINDO
// =================================================================

function setupSaveProgress(itemData) {
    // Guarda os dados do filme atual na variável global quando abre o player
    currentVideoContext = itemData;

    // Se for série, mostra inputs de temp/ep. Se filme, esconde.
    const serieInputs = document.getElementById('serie-inputs');
    if (serieInputs) {
        serieInputs.style.display = (itemData.type === 'tv') ? 'flex' : 'none';
    }

    // Tenta preencher os inputs se já tiver progresso salvo antes
    const user = getActiveUser();
    if (user && user.history) {
        const saved = user.history.find(h => String(h.id) === String(itemData.id));
        if (saved) {
            document.getElementById('stop-hour').value = saved.progress.h || 0;
            document.getElementById('stop-min').value = saved.progress.m || 0;
            if (itemData.type === 'tv') {
                document.getElementById('current-season').value = saved.progress.s || 1;
                document.getElementById('current-episode').value = saved.progress.ep || 1;
            }
        }
    }
}

// Funções Atualizadas para Cloud

function toggleMinhaLista(item, btn) {
    if (!currentUser || !userData) return showToast("Faça login para salvar!", "error");

    const list = userData.minhaLista || [];
    const exists = list.find(i => String(i.id) === String(item.id));

    if (exists) {
        userData.minhaLista = list.filter(i => String(i.id) !== String(item.id));
        showToast("Removido da Lista", "info");
    } else {
        userData.minhaLista.push(item);
        showToast("Adicionado à Lista", "success");
    }

    updateListaButton(btn, item.id);
    saveUserDataToCloud(); // Salva na nuvem
}

function updateListaButton(btn, id) {
    if (!userData || !btn) return;
    // Verifica se a lista existe antes de rodar o .some()
    const exists = (userData.minhaLista && userData.minhaLista.some(i => String(i.id) === String(id)));
    if (exists) {
        btn.innerHTML = '<i class="fas fa-check"></i> Na Lista';
        btn.classList.add('active');
        btn.style.backgroundColor = '#4CAF50';
    } else {
        btn.innerHTML = '<i class="fas fa-bookmark"></i> Minha Lista';
        btn.classList.remove('active');
        btn.style.backgroundColor = '';
    }
}

function initMinhaListaPage() {
    const container = document.getElementById('lista-container');
    if (!container) return;

    if (!userData || !userData.minhaLista || !userData.minhaLista.length) {
        container.innerHTML = `<div class="empty-state">
            <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 20px; color: #333;"></i>
            <h3>Sua lista está vazia.</h3>
        </div>`;
        return;
    }

    container.innerHTML = userData.minhaLista.map(item => `
    <div class="content-card-wrapper">
        <a href="detalhes.html?id=${item.id}&type=${item.type}" class="content-card">
            <img src="${item.poster}" loading="lazy">
            <div class="card-info"><h3>${item.titulo}</h3></div>
        </a>
        <button onclick="removeItemLista('${item.id}')" class="btn-remove-lista"><i class="fas fa-trash"></i> Remover</button>
    </div>`).join('');
}

window.removeItemLista = function (id) {
    if (!userData) return;
    userData.minhaLista = userData.minhaLista.filter(i => String(i.id) !== String(id));
    saveUserDataToCloud();
    initMinhaListaPage();
    showToast("Item removido.", "info");
};

function initSaveButton() {
    const btn = document.getElementById('save-progress-btn');
    if (!btn) return;
    btn.onclick = () => {
        if (!currentUser) return showToast("Faça login!", "error");

        const h = document.getElementById('stop-hour').value || 0;
        const m = document.getElementById('stop-min').value || 0;
        const s = document.getElementById('current-season').value || 1;
        const ep = document.getElementById('current-episode').value || 1;

        if (!userData.history) userData.history = [];
        // Remove anterior e adiciona novo no topo
        userData.history = userData.history.filter(i => String(i.id) !== String(currentVideoContext.id));
        userData.history.unshift({ ...currentVideoContext, progress: { h, m, s, ep } });

        saveUserDataToCloud();
        showToast("Progresso salvo na nuvem!", "success");
        loadContinueWatching();
    };
}

function loadContinueWatching() {
    const section = document.getElementById('continue-watching-section');
    // Verificação manual completa
    if (!section || !userData || !userData.history || !userData.history.length) {
        if (section) section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    section.querySelector('.container').innerHTML = `<h2>Continuar Assistindo (${userData.username})</h2>
    <div class="carousel-wrapper"><div class="carousel">${userData.history.map(item => `
        <div class="history-item-wrapper">
            <button onclick="removeFromHistory('${item.id}')" class="btn-remove-history"><i class="fas fa-times"></i></button>
            <a href="detalhes.html?id=${item.id}&type=${item.type}" class="content-card">
                <img src="${item.poster}" loading="lazy">
                <div style="position:absolute;bottom:0;background:rgba(0,0,0,0.8);width:100%;padding:5px;font-size:0.8rem;color:#ccc;">
                    ${item.type === 'tv' ? `T${item.progress.s}:E${item.progress.ep}` : ''} ${item.progress.h}h ${item.progress.m}m
                </div>
            </a>
        </div>`).join('')
        }</div></div>`;

    // Botões do Carrossel (Padrão)
    const prev = document.createElement('button');
    prev.className = 'carousel-btn prev';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.onclick = () => carousel.scrollBy({ left: -300, behavior: 'smooth' });

    const next = document.createElement('button');
    next.className = 'carousel-btn next';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.onclick = () => carousel.scrollBy({ left: 300, behavior: 'smooth' });

    wrapper.append(prev, carousel, next);
    container.appendChild(wrapper);
}

window.removeFromHistory = function (id) {
    if (!userData) return;
    userData.history = userData.history.filter(i => String(i.id) !== String(id));
    saveUserDataToCloud();
    loadContinueWatching();
    showToast("Removido.", "info");
};

// --- NOVA FUNÇÃO: Remover item específico ---
window.removeFromHistory = function (id) {
    // 1. Pega usuário
    const user = getActiveUser();
    if (!user || !user.history) return;

    // 2. Filtra o histórico removendo o item com o ID passado
    // Usamos String() para garantir que comparação de número/texto funcione
    user.history = user.history.filter(item => String(item.id) !== String(id));

    // 3. Salva no LocalStorage
    updateActiveUser(user);

    // 4. Recarrega a seção visualmente
    // Se a lista ficar vazia, a própria função loadContinueWatching vai esconder a aba (display: none)
    loadContinueWatching();

    // 5. Feedback visual
    showToast("Removido do histórico.", "info");
};

// =================================================================
// LÓGICA DO CARROSSEL HERO (COM BARRAS DE PROGRESSO)
// =================================================================

let heroInterval; // Variável global para controlar o timer

function initHeroCarousel(items) {
    const sliderContainer = document.getElementById('hero-slider');
    const indicatorsContainer = document.getElementById('hero-indicators'); // Pegamos o container das barras
    const prevBtn = document.getElementById('hero-prev');
    const nextBtn = document.getElementById('hero-next');

    if (!sliderContainer || items.length === 0) return;

    // 1. Gera o HTML dos Slides
    let slidesHTML = '';
    let indicatorsHTML = '';

    items.forEach((item, index) => {
        const type = item.media_type || 'movie';
        const titulo = item.title || item.name;
        const sinopse = item.overview ? item.overview.substring(0, 150) + "..." : "";
        const bg = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : 'images/banner-filme.jpg';

        const activeClass = index === 0 ? 'active' : '';

        // Cria o Slide
        slidesHTML += `
        <div class="hero-slide ${activeClass}" data-index="${index}">
            <img src="${bg}" alt="${titulo}">
            <div class="container hero-content">
                <h1>${titulo}</h1>
                <p>${sinopse}</p>
                <div class="hero-actions">
                    <button class="btn btn-play" onclick="playHeroMovie('${item.id}', '${type}')">
                        <i class="fas fa-play"></i> Assistir Agora
                    </button>
                    <a href="detalhes.html?id=${item.id}&type=${type}" class="btn btn-info">
                        <i class="fas fa-info-circle"></i> Mais Informações
                    </a>
                </div>
            </div>
        </div>`;

        // Cria a Barrinha de Progresso
        // A div "indicator-fill" é quem vai animar
        indicatorsHTML += `
            <div class="indicator-bar ${activeClass}" onclick="goToSlide(${index})">
                <span class="indicator-fill"></span>
            </div>
        `;
    });

    sliderContainer.innerHTML = slidesHTML;

    // Se existir o container de indicadores, coloca o HTML lá
    if (indicatorsContainer) {
        indicatorsContainer.innerHTML = indicatorsHTML;
    }

    // 2. Lógica de Navegação
    const slides = document.querySelectorAll('.hero-slide');
    const bars = document.querySelectorAll('.indicator-bar');
    let currentIndex = 0;
    const totalSlides = slides.length;

    // Função que muda visualmente o slide e a barra
    const showSlide = (index) => {
        // Remove active de todos (Slides e Barras)
        slides.forEach(s => s.classList.remove('active'));
        bars.forEach(b => {
            b.classList.remove('active');
            // Hack para reiniciar a animação CSS: clonar o elemento fill
            // Isso força o navegador a começar a barra do zero sempre que muda
            const fill = b.querySelector('.indicator-fill');
            if (fill) {
                fill.style.animation = 'none';
                void fill.offsetWidth; // Força reflow (reinicia o render)
                fill.style.animation = ''; // Remove o override para o CSS voltar a valer
            }
        });

        // Adiciona no atual
        slides[index].classList.add('active');

        // Pequeno delay para garantir que o CSS entenda que mudou e inicie a animação
        setTimeout(() => {
            if (bars[index]) bars[index].classList.add('active');
        }, 10);
    };

    const nextSlide = () => {
        currentIndex = (currentIndex + 1) % totalSlides;
        showSlide(currentIndex);
    };

    const prevSlide = () => {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        showSlide(currentIndex);
    };

    // Nova função global para clicar na barrinha e ir direto pro filme
    window.goToSlide = (index) => {
        currentIndex = index;
        showSlide(currentIndex);
        resetTimer();
    };

    // 3. Eventos dos Botões
    if (nextBtn) nextBtn.onclick = () => {
        nextSlide();
        resetTimer();
    };

    if (prevBtn) prevBtn.onclick = () => {
        prevSlide();
        resetTimer();
    };

    // 4. Timer Automático (Sincronizado com o CSS de 5s)
    const startTimer = () => {
        // Limpa qualquer timer anterior para não encavalar
        if (heroInterval) clearInterval(heroInterval);
        heroInterval = setInterval(nextSlide, 5000); // 5000ms = 5 segundos
    };

    const resetTimer = () => {
        clearInterval(heroInterval);
        startTimer();
    };

    // Inicia tudo
    startTimer();
}

// Função auxiliar para o botão assistir dentro do HTML gerado
window.playHeroMovie = function (id, type) {
    // Busca IDs externos (IMDB) se necessário
    fetchTMDB(`/${type}/${id}/external_ids`).then(ids => {
        const playId = ids.imdb_id || id;
        const playerBase = (type === 'tv') ? TV_PLAYER_BASE : MOVIE_PLAYER_BASE;
        openVideoModal(`${playerBase}/${playId}`);
    });
};

// =================================================================
//  MÓDULO DE SISTEMA (Gerencia Chaves e Configurações)
// =================================================================
const System = {
    saveKey(key) {
        if (!key || key.trim() === "") return false;
        localStorage.setItem('winbry_gemini_key', key.trim());
        return true;
    },

    getKey() {
        return localStorage.getItem('winbry_gemini_key');
    },

    initSettings() {
        const input = document.getElementById('user-api-key');
        const btn = document.getElementById('btn-save-key');

        if (input && btn) {
            const current = this.getKey();
            if (current) input.value = current;

            btn.onclick = () => {
                if (this.saveKey(input.value)) {
                    showToast("Chave API salva com sucesso!", "success");
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast("Por favor, insira uma chave válida.", "error");
                }
            };
        }
    }
};

// =================================================================
//  MÓDULO BRY.IA (Inteligência Artificial)
// =================================================================
const BryIA = {
    elements: {
        fab: document.getElementById('bryia-fab'),
        window: document.getElementById('bryia-window'),
        close: document.getElementById('close-bryia'),
        send: document.getElementById('bryia-send'),
        input: document.getElementById('bryia-input'),
        msgs: document.getElementById('bryia-messages')
    },

    init() {
        if (!this.elements.fab) return;
        this.elements.fab.onclick = () => this.elements.window.classList.toggle('active');
        if (this.elements.close) this.elements.close.onclick = () => this.elements.window.classList.remove('active');
        this.elements.send.onclick = () => this.sendMessage();
        this.elements.input.onkeypress = (e) => { if (e.key === 'Enter') this.sendMessage(); };
    },

    async sendMessage() {
        const text = this.elements.input.value.trim();
        if (!text) return;

        this.appendMsg(text, 'user');
        this.elements.input.value = '';

        const key = System.getKey();
        if (!key) {
            this.appendMsg(
                "⚠️ <b>Preciso da sua API Key!</b><br><br>" +
                "1. Pegue sua chave grátis no <a href='https://aistudio.google.com/app/apikey' target='_blank' style='color: #ff4444; text-decoration: underline;'>Google AI Studio</a>.<br>" +
                "2. Depois, vá em <b>Minha Conta</b> aqui no site e cole a chave lá.",
                'bot'
            );
            return;
        }

        const loadingId = this.appendMsg("Pensando...", 'bot', true);

        try {
            const reply = await this.callGemini(text, key);
            const loadEl = document.getElementById(loadingId);
            if (loadEl) loadEl.remove();
            await this.processResponse(reply);
        } catch (error) {
            const loadEl = document.getElementById(loadingId);
            if (loadEl) loadEl.remove();

            // Tratamento Elegante de Erros
            if (error.message.includes('429')) {
                this.appendMsg("😴 Atingi meu limite de pensamentos por agora. Tente daqui a pouco!", 'bot');
            } else {
                console.error("BryIA Error:", error);
                this.appendMsg(`Erro: ${error.message}`, 'bot');
            }
        }
    },

    async callGemini(prompt, key) {
        const modelName = "gemini-2.5-flash"; // ou gemini-1.5-flash se preferir
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

        // --- CONTEXTO INTELIGENTE (LÊ A TELA) ---
        let contextoPagina = "";

        // Verifica se está vendo um filme/série
        const tituloNaTela = document.querySelector('.info-text h1');
        if (tituloNaTela) {
            const titulo = tituloNaTela.innerText;
            const elNota = document.querySelector('.star-rating');
            const nota = elNota ? elNota.innerText : "N/A";
            const elSinopse = document.querySelector('#synopsis-content');
            const sinopse = elSinopse ? elSinopse.innerText : "";

            contextoPagina = `
            CONTEXTO: O usuário está na página do filme: "${titulo}". Nota: ${nota}.
            `;
        } else if (window.location.pathname.includes('minha-lista')) {
            contextoPagina = "CONTEXTO: O usuário está na 'Minha Lista'.";
        }

        // --- A CORREÇÃO PRINCIPAL ESTÁ AQUI (INSTRUÇÃO MAIS FORTE) ---
        const systemInstruction = `
        Você é a BryIA, assistente do site de filmes WinBry+.
        Seja simpática e use emojis 🍿.
        
        ${contextoPagina}
        
        ⚠️ REGRA SUPREMA DE FUNCIONAMENTO:
        Sempre que você mencionar um filme ou série, você É OBRIGADA a usar este formato exato: [BUSCA:Nome do Filme].
        
        Exemplo ERRADO: "Assista Vingadores, é muito bom."
        Exemplo CORRETO: "Assista [BUSCA:Vingadores Ultimato], é muito bom."
        
        Se você não usar o [BUSCA:...], o botão de assistir NÃO aparecerá para o usuário.
        `;

        const payload = {
            contents: [{
                parts: [{
                    text: `${systemInstruction}\n\nUsuário: ${prompt}\nBryIA:`
                }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 429) throw new Error("429 - Limite Atingido");
            if (response.status === 404) throw new Error("Modelo não disponível na sua conta.");
            const msgErro = (data.error && data.error.message) ? data.error.message : "Erro na API";
            throw new Error(msgErro);
        }

        // Verifica segurança se a resposta veio vazia
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("A IA não retornou nada.");
        }

        return data.candidates[0].content.parts[0].text;
    },

    async processResponse(text) {
        console.log("Resposta Bruta da IA:", text); // Para você ver no Console (F12) se a tag está vindo

        const searchRegex = /\[BUSCA:(.*?)\]/g;

        // 1. Mostra o texto bonito (transforma a tag feia em negrito)
        let cleanText = text.replace(searchRegex, "<b>$1</b>");
        this.appendMsg(cleanText, 'bot');

        // 2. Busca os filmes para criar os cards
        // Resetamos o índice do Regex para garantir que o loop funcione do zero
        searchRegex.lastIndex = 0;

        let match;
        // O loop varre o texto procurando todas as tags [BUSCA:...]
        while ((match = searchRegex.exec(text)) !== null) {
            const termo = match[1].trim();
            if (termo) {
                console.log("Gerando card para:", termo);
                await this.searchAndCreateCard(termo);
            }
        }
    },

    async searchAndCreateCard(query) {
        const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=pt-BR`);
        if (data && data.results && data.results.length > 0) {
            const bestMatch = data.results.find(i => i.media_type === 'movie' || i.media_type === 'tv');
            if (bestMatch) this.createCardHtml(bestMatch);
        }
    },

    createCardHtml(item) {
        const div = document.createElement('div');
        div.className = 'message bot';
        const poster = item.poster_path ? `${IMG_BASE}${item.poster_path}` : 'images/favicon.png';
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '????').substring(0, 4);
        const type = item.media_type || 'movie';

        div.innerHTML = `
            <div class="bryia-card">
                <img src="${poster}" onerror="this.src='images/favicon.png'">
                <div class="bryia-card-info">
                    <h4>${title} <small>(${year})</small></h4>
                    <a href="detalhes.html?id=${item.id}&type=${type}" class="btn-play-mini"><i class="fas fa-play"></i> Ver</a>
                </div>
            </div>`;
        this.elements.msgs.appendChild(div);
        this.elements.msgs.scrollTop = this.elements.msgs.scrollHeight;
    },

    appendMsg(text, sender, isLoading = false) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;

        // CORREÇÃO: Agora damos um nome (ID) para a bolinha, assim podemos achá-la para apagar depois
        if (isLoading) div.id = 'loading-msg';

        div.innerHTML = isLoading
            ? `<div class="msg-text"><i class="fas fa-circle-notch fa-spin"></i></div>`
            : `<div class="msg-text">${text}</div>`;

        this.elements.msgs.appendChild(div);
        this.elements.msgs.scrollTop = this.elements.msgs.scrollHeight;

        // Retorna o nome para a função sendMessage usar
        return isLoading ? 'loading-msg' : null;
    }
};

// =================================================================
//  FUNÇÃO SURPREENDA-ME (Botão da Esquerda)
// =================================================================
async function surpreendaMe() {
    try {
        // Pega uma página aleatória (1 a 50)
        const randomPage = Math.floor(Math.random() * 50) + 1;
        const data = await fetchTMDB(`/movie/popular?page=${randomPage}`);

        if (data && data.results && data.results.length > 0) {
            const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
            if (randomMovie && randomMovie.id) {
                // Redireciona
                window.location.href = `detalhes.html?id=${randomMovie.id}&type=movie`;
            }
        } else {
            showToast("Tente novamente...", "error");
        }
    } catch (e) {
        console.error("Erro Shuffle:", e);
    }
}

// =================================================================
//  INICIALIZADOR MESTRE (LIGA TUDO NO FINAL)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("WinBry+ Mestre Iniciado 🚀");

    // 1. Inicializações Visuais
    if (typeof initTheme === 'function') initTheme();
    if (typeof initMenuMobile === 'function') initMenuMobile();
    if (typeof initSearch === 'function') initSearch();
    if (typeof initVideoModal === 'function') initVideoModal();
    if (typeof initHeaderUser === 'function') initHeaderUser();
    if (typeof initTransitionManager === 'function') initTransitionManager();
    if (typeof initSaveButton === 'function') initSaveButton();
    if (typeof loadContinueWatching === 'function') loadContinueWatching();

    // 2. Formulários
    const cadastroForm = document.getElementById("cadastroForm");
    if (cadastroForm && typeof initCadastro === 'function') initCadastro(cadastroForm);

    const loginForm = document.getElementById("loginForm");
    if (loginForm && typeof initLogin === 'function') initLogin(loginForm);

    if (document.querySelector('.account-info-card') && typeof initMinhaConta === 'function') {
        initMinhaConta();
    }

    // 3. Inicializa IA e Sistema
    try {
        if (typeof System !== 'undefined') System.initSettings();
        if (typeof BryIA !== 'undefined') BryIA.init();
    } catch (e) { console.error("Erro IA:", e); }

    // 4. Header Fade In
    const userActions = document.querySelector('.user-actions');
    if (userActions) {
        setTimeout(() => {
            userActions.style.opacity = '1';
            userActions.style.visibility = 'visible';
        }, 100);
    }

    // 5. Roteamento Inteligente
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type');
    const search = params.get('search');
    const isHub = params.get('global') === 'true';

    // Seletor de Página
    if (path.includes('detalhes') && id && type) {
        if (typeof loadDetails === 'function') loadDetails(type, id);
    }
    else if (path.includes('filmes')) {
        currentType = 'movie';
        if (search && typeof handleSearchRouting === 'function') handleSearchRouting(search, 'movie', isHub);
        else if (typeof loadCatalog === 'function') loadCatalog('movie', 1);
    }
    else if (path.includes('series')) {
        currentType = 'tv';
        if (search && typeof loadSearch === 'function') loadSearch(search, 'tv', 1);
        else if (typeof loadCatalog === 'function') loadCatalog('tv', 1);
    }
    else if (path.includes('animes')) {
        currentType = 'anime';
        if (search && typeof loadSearch === 'function') loadSearch(search, 'tv', 1);
        else if (typeof loadAnimes === 'function') loadAnimes(1);
    }
    else if (path.includes('minha-lista')) {
        if (typeof initMinhaListaPage === 'function') initMinhaListaPage();
    }
    else if (path.includes('index') || path === '/' || path.endsWith('/')) {
        if (typeof loadHome === 'function') loadHome();
    }
});

// --- FUNÇÃO ESQUECI MINHA SENHA (CORRIGIDA E MELHORADA) ---
function initEsqueciSenha() {
    const btn = document.getElementById('btn-esqueci-senha');
    if (!btn) return;

    btn.onclick = async (e) => {
        e.preventDefault(); // Impede a página de pular ou recarregar

        // 1. Tenta pegar o e-mail do campo de login
        let email = document.getElementById('email').value.trim();

        // 2. Se o campo estiver vazio, PERGUNTA ao usuário via Prompt
        if (!email) {
            email = prompt("Por favor, digite seu e-mail para recuperar a senha:");
        }

        // 3. Se ainda assim estiver vazio (usuário cancelou), para tudo
        if (!email) return;

        // 4. Manda o Firebase enviar o e-mail
        try {
            showToast("Enviando e-mail de recuperação...", "info");
            await auth.sendPasswordResetEmail(email);
            showToast(`E-mail enviado para: ${email}. Verifique sua caixa de entrada e spam!`, "success");
        } catch (error) {
            console.error(error);
            const msg = (typeof getFirebaseErrorMessage === 'function')
                ? getFirebaseErrorMessage(error)
                : "Erro ao enviar e-mail. Verifique se o endereço está correto.";
            showToast(msg, "error");
        }
    };
}

// --- TRADUTOR DE ERROS COMPLETO (PORTUGUÊS) ---
function getFirebaseErrorMessage(error) {
    const code = error.code || "";

    switch (code) {
        // --- PROBLEMAS COM E-MAIL E SENHA ---
        case 'auth/email-already-in-use':
            return "Este e-mail já está sendo usado por outra pessoa. Tente fazer login.";

        case 'auth/invalid-email':
            return "O e-mail digitado não é válido. Verifique se digitou corretamente.";

        case 'auth/weak-password':
            return "Sua senha é muito fraca. Ela precisa ter pelo menos 6 caracteres.";

        case 'auth/wrong-password':
            return "Senha incorreta. Tente novamente ou redefina sua senha.";

        case 'auth/user-not-found':
            return "Não encontramos nenhuma conta com esse e-mail.";

        case 'auth/invalid-credential':
            return "E-mail ou senha incorretos. Verifique seus dados.";

        // --- SEGURANÇA E BLOQUEIOS ---
        case 'auth/user-disabled':
            return "Esta conta foi desativada por segurança. Entre em contato com o suporte.";

        case 'auth/too-many-requests':
            return "Muitas tentativas falhas seguidas! O acesso foi bloqueado temporariamente. Espere alguns minutos.";

        case 'auth/requires-recent-login':
            return "Por segurança, faça logout e login novamente antes de excluir sua conta.";

        // --- RECUPERAÇÃO DE SENHA ---
        case 'auth/missing-email':
            return "Por favor, digite o e-mail no campo acima para recuperar a senha.";

        // --- ERROS TÉCNICOS ---
        case 'auth/network-request-failed':
            return "Sem conexão com a internet. Verifique seu Wi-Fi/Dados.";

        case 'auth/operation-not-allowed':
            return "Erro no sistema (Login não habilitado no Firebase). Avise o administrador.";

        case 'auth/popup-closed-by-user':
            return "O login foi cancelado.";

        // --- ERRO DESCONHECIDO ---
        default:
            return "Ocorreu um erro inesperado: " + error.message;
    }
}

if (document.getElementById("btn-google-login")) {
    initGoogleLogin();
}

// =================================================================
// LOADER DE TRANSIÇÃO (FLUIDO E SÓLIDO)
// =================================================================

function initGlobalLoader() {
    // 1. Injeta o HTML na página se não existir
    if (!document.getElementById('global-loader')) {
        const loaderHTML = `
            <div id="global-loader">
                <div class="spinner-ring"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
    }

    const loader = document.getElementById('global-loader');

    // Funções de Controle
    const showLoader = () => loader && loader.classList.add('visible');
    const hideLoader = () => loader && loader.classList.remove('visible');

    // --- EVENTOS ---

    // 1. Ao carregar a página: Esconde o loader (Fade Out)
    // Pequeno delay para garantir que o layout carregou
    window.addEventListener('load', () => setTimeout(hideLoader, 300));

    // 2. Correção para botão "Voltar" (Safari/Mobile)
    window.addEventListener('pageshow', hideLoader);

    // 3. Interceptar Cliques
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');

        // Só ativa se for link interno real
        if (link && link.href &&
            link.href.includes(window.location.hostname) &&
            !link.target &&
            !link.href.includes('#') &&
            !link.getAttribute('download') &&
            !link.href.includes('javascript')) {

            e.preventDefault(); // Para a navegação padrão

            showLoader(); // Tela fica preta instantaneamente

            // Espera o tempo "cinematográfico" antes de trocar
            setTimeout(() => {
                window.location.href = link.href;
            }, 1000);
        }
    });
}

// --- FUNÇÕES DE AUTH QUE FALTAVAM ---

function initLogin(form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const btn = form.querySelector('button');

        try {
            btn.disabled = true;
            btn.innerText = "Entrando...";
            await auth.signInWithEmailAndPassword(email, senha);
            window.location.href = 'index.html';
        } catch (error) {
            btn.disabled = false;
            btn.innerText = "Entrar";
            const msg = (typeof getFirebaseErrorMessage === 'function') ? getFirebaseErrorMessage(error) : error.message;
            showToast(msg, "error");
        }
    }
}

function initCadastro(form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const confSenha = document.getElementById('confirmar-senha').value;

        if (senha !== confSenha) return showToast("As senhas não coincidem", "error");

        try {
            showToast("Criando conta...", "info");
            const userCred = await auth.createUserWithEmailAndPassword(email, senha);

            // Salva nome
            await userCred.user.updateProfile({ displayName: nome });

            // Cria no Banco
            await db.collection('users').doc(userCred.user.uid).set({
                username: nome,
                email: email,
                minhaLista: [],
                history: []
            });

            showToast("Conta criada com sucesso!", "success");
            setTimeout(() => window.location.href = 'index.html', 1500);

        } catch (error) {
            const msg = (typeof getFirebaseErrorMessage === 'function') ? getFirebaseErrorMessage(error) : error.message;
            showToast(msg, "error");
        }
    }
}