// State and local data storage

// ══════════════════════════════════════════════════════
//  DATA STORE (localStorage)
// ══════════════════════════════════════════════════════
const MAIN_CATS = ['농산','축산','수산','공산','매장 그래픽','지점 운영 광고'];
const PRESET_TYPES = ['행잉형','스탠드형','A3/A4 가로형','A3/A4 세로형','배너형','현수막형','평대 자석','바닥 시트'].sort((a,b) => a.localeCompare(b, 'ko'));

// 고정 사이즈 타입 (선택 시 자동 입력)
const FIXED_SIZE_TYPES = {
  'A3 가로형': {w: '420', h: '297'},
  'A4 세로형': {w: '210', h: '297'}
};

const ADMIN_PIN = '1234';

const STORAGE_KEY = 'kims_archive_v5'; // fallback용

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var d = JSON.parse(raw);
      d.requests = []; // requests는 항상 Supabase에서 로드
      d.ads = []; // ads는 항상 Supabase에서 로드
      d.subs = []; // subs는 항상 Supabase에서 로드
      d.products = []; // products는 항상 Supabase에서 로드
      return d;
    }
  } catch(e) {}
  return { subs: [], products: [], ads: [], requests: [], nextId: 100 };
}

function saveData() {
  try {
    // requests는 Supabase가 원본 - localStorage에 저장 안 함
    // ads에서 base64 이미지 제거 (브라우저 용량 5MB 초과 방지)
    var adsToSave = (DB.ads||[]).map(function(ad) {
      return Object.assign({}, ad, {
        types: (ad.types||[]).map(function(t) {
          return Object.assign({}, t, {
            src: (t.src && t.src.startsWith('data:')) ? '' : (t.src||'')
          });
        }),
        // 셋팅 사진에서도 base64 이미지 필터링 추가
        settingPhotos: (ad.settingPhotos||[]).map(function(p) {
          var src = typeof p === 'object' ? (p.src||'') : p;
          var store = typeof p === 'object' ? (p.storeName||'') : '';
          return {
            src: src.startsWith('data:') ? '' : src, 
            storeName: store 
          };
        })
      });
    });
    var toSave = {subs:DB.subs, products:DB.products, ads:adsToSave, nextId:DB.nextId};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch(e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

let DB = loadData();

// ── DB helpers ──

function getSubs(mainCat) { return DB.subs.filter(s=>s.mainCat===mainCat).sort((a,b)=>a.name.localeCompare(b.name,'ko')); }
function getProds(mainCat,subCat) { return DB.products.filter(p=>p.mainCat===mainCat&&p.subCat===subCat).sort((a,b)=>a.name.localeCompare(b.name,'ko')); }
function getAds(mainCat,subCat,prod) { return DB.ads.filter(a=>a.mainCat===mainCat&&a.subCat===subCat&&a.product===prod); }
function nextId() { return DB.nextId++; }

// ══════════════════════════════════════════════════════
//  APP STATE
// ══════════════════════════════════════════════════════
let curView = 'home';
let homeScreen = 'A';
// 새로고침해도 관리자 로그인 유지 (탭/브라우저 닫으면 자동 초기화)
let adminLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';

// ── 페이지 상태 저장/복원 (새로고침 대응) ──
function savePageState() {
  try {
    sessionStorage.setItem('pageState', JSON.stringify({
      curView, homeScreen,
      hState: hState,
      aState: aState,
      adminTab
    }));
  } catch(e) {}
}
function loadPageState() {
  try {
    var raw = sessionStorage.getItem('pageState');
    if(!raw) return false;
    var s = JSON.parse(raw);
    curView    = s.curView    || 'home';
    homeScreen = s.homeScreen || 'A';
    if(s.hState) hState = s.hState;
    if(s.aState) aState = s.aState;
    if(s.adminTab) adminTab = s.adminTab;
    return true;
  } catch(e) { return false; }
}

let hState = {cat:'',sub:'',prod:'__all__'};
let aState = {cat:'농산', sub:'', prod:'__all__', search:''};
let adminTab = 'archive'; // 'archive' | 'requests'
let aiTypeCount = 0;
let aiTypeSrcs = {};
// edit detail state
let detailAd = null;
let detailTab = 'view';
let editTypeCount = 0;
let editTypeSrcs = {};

