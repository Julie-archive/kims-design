// 마이그레이션 스크립트 - 한 번만 실행
const SUPABASE_URL = 'https://qayhutfedlhzhtrlserh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NoUBNfjDdpbJJgBDsdpKxw_K9IEg4UP';

async function migrateToFirebase() {
  console.log('마이그레이션 시작...');
  
  var { collection, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  var db = window.db;

  // Supabase에서 데이터 가져오기
  var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  
  var [subsRes, prodsRes, adsRes, reqsRes] = await Promise.all([
    sb.from('subs').select('*').order('id'),
    sb.from('products').select('*').order('id'),
    sb.from('ads').select('*').order('id'),
    sb.from('requests').select('*').order('id')
  ]);

  console.log('Supabase 데이터 로드 완료');
  console.log('subs:', subsRes.data?.length);
  console.log('products:', prodsRes.data?.length);
  console.log('ads:', adsRes.data?.length);
  console.log('requests:', reqsRes.data?.length);

  // subs 이전
  for(var s of subsRes.data||[]) {
    await setDoc(doc(db, 'subs', String(s.id)), {id:s.id, mainCat:s.main_cat, name:s.name});
  }
  console.log('subs 이전 완료');

  // products 이전
  for(var p of prodsRes.data||[]) {
    await setDoc(doc(db, 'products', String(p.id)), {id:p.id, mainCat:p.main_cat, subCat:p.sub_cat, name:p.name});
  }
  console.log('products 이전 완료');

  // ads 이전
  for(var a of adsRes.data||[]) {
    await setDoc(doc(db, 'ads', String(a.id)), {
      id:a.id, mainCat:a.main_cat, subCat:a.sub_cat, product:a.product,
      title:a.title, adDate:a.ad_date, types:a.types||[], memo:a.memo||'',
      settingPhotos:a.setting_photos||[], orderAmount:a.order_amount||''
    });
  }
  console.log('ads 이전 완료');

  // requests 이전
  for(var r of reqsRes.data||[]) {
    await setDoc(doc(db, 'requests', String(r.id)), {
      id:r.id, reqCode:r.req_code||'', submittedAt:r.submitted_at, status:r.status,
      dept:r.dept, name:r.name, tel:r.tel, title:r.title, deadline:r.deadline||'',
      adTypes:r.ad_types||[], bannerType:r.banner_type||'', customSize:r.custom_size||'',
      adTitle:r.ad_title||'', selling:r.selling||'', eventStart:r.event_start||'', eventEnd:r.event_end||'',
      eventDesc:r.event_desc||'', sitePhotoSrcs:r.site_photo_srcs||[], refImageSrcs:r.ref_image_srcs||[],
      manager:r.manager||'', dueDate:r.due_date||'',
      branch:r.branch||'', deliveryDay:r.delivery_day||'',
      adTypeDetails:r.ad_type_details||{}, productPhotoSrcs:r.product_photo_srcs||[],
      rejectReason:r.reject_reason||'', email:r.email||''
    });
  }
  console.log('requests 이전 완료');
  console.log('✅ 마이그레이션 완료!');
}

window.migrateToFirebase = migrateToFirebase;
