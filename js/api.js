// Supabase API and upload helpers

const SUPABASE_URL = 'https://qayhutfedlhzhtrlserh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NoUBNfjDdpbJJgBDsdpKxw_K9IEg4UP';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Supabase 동기화 함수들
async function sbLoadAll() {
  try {
    const [subsRes, prodsRes, adsRes] = await Promise.all([
      sb.from('subs').select('*').order('id'),
      sb.from('products').select('*').order('id'),
      sb.from('ads').select('*').order('id'),
    ]);
    if(subsRes.error || prodsRes.error || adsRes.error) throw new Error('Load failed');
    DB.subs = subsRes.data.map(function(r){ return {id:r.id, mainCat:r.main_cat, name:r.name}; });
    DB.products = prodsRes.data.map(function(r){ return {id:r.id, mainCat:r.main_cat, subCat:r.sub_cat, name:r.name}; });
    DB.ads = adsRes.data.map(function(r){ return {id:r.id, mainCat:r.main_cat, subCat:r.sub_cat, product:r.product, title:r.title, adDate:r.ad_date, types:r.types||[], memo:r.memo||'', settingPhotos:r.setting_photos||[], orderAmount:r.order_amount||''}; });

    // base64 또는 __pending__ 자동 복구
    setTimeout(async function() {
      // localStorage 백업과 Supabase 데이터 병합 - 로컬에는 있는데 Supabase에 없는 경우 복구
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if(raw) {
          var local = JSON.parse(raw);
          var localAds = local.ads || [];
          var dbIds = new Set(DB.ads.map(function(a){ return a.id; }));
          // 로컬에만 있는 광고 (Supabase 저장 실패한 것들)
          var orphans = localAds.filter(function(la){ return !dbIds.has(la.id) && la.title; });
          if(orphans.length > 0) {
            console.warn('[sbLoadAll] 로컬에만 있는 광고 발견:', orphans.length, '개 - 재저장 시도');
            for(var oi=0; oi<orphans.length; oi++) {
              var oad = orphans[oi];
              // base64 이미지 Storage 업로드 후 재저장 시도
              var fixedTypes = await processAdTypes(oad.types||[]);
              oad.types = fixedTypes;
              var saved = await sbSaveAd(oad);
              if(saved) {
                DB.ads.push(oad);
                console.log('[sbLoadAll] 복구 성공:', oad.title);
              }
            }
            saveData();
          }
        }
      } catch(recErr) { console.warn('[sbLoadAll] 복구 시도 중 오류:', recErr); }

      // base64가 남아있는 광고 Storage 재업로드
      var toFix = DB.ads.filter(function(ad){
        return (ad.types||[]).some(function(t){ return t.src && (t.src.startsWith('data:') || t.src === '__pending__'); });
      });
      for(var i=0; i<toFix.length; i++) {
        var ad = toFix[i];
        var fixed = await processAdTypes(ad.types);
        var idx = DB.ads.findIndex(function(a){ return a.id===ad.id; });
        if(idx!==-1) { DB.ads[idx].types = fixed; sbUpdateAd(DB.ads[idx]); }
      }
      if(toFix.length > 0) {
        saveData();
        if(homeScreen==='B') renderHomeContent();
        if(curView==='admin') renderAdminContent();
      }
    }, 1000);
  } catch(e) {
    console.warn('Supabase load failed:', e);
    return false;
  }

  // requests는 별도 로드 — 실패해도 나머지 데이터는 유지
  try {
    const reqsRes = await sb.from('requests').select('*').order('id', {ascending: false});
    if(reqsRes.error) { console.error('[sbLoadAll] requests error:', reqsRes.error); }
    if(!reqsRes.error && reqsRes.data) {
      DB.requests = reqsRes.data.map(function(r){ return {
        id:r.id, reqCode:r.req_code, submittedAt:r.submitted_at, status:r.status,
        dept:r.dept, name:r.name, tel:r.tel, title:r.title, deadline:r.deadline,
        adTypes:r.ad_types||[], bannerType:r.banner_type||'', customSize:r.custom_size||'',
        adTitle:r.ad_title, selling:r.selling, eventStart:r.event_start||'', eventEnd:r.event_end||'',
        eventDesc:r.event_desc, sitePhotoSrcs:r.site_photo_srcs||[], refImageSrcs:r.ref_image_srcs||[],
        manager:r.manager||'', dueDate:r.due_date||'',
        branch:r.branch||'', deliveryDay:r.delivery_day||'',
        adTypeDetails:r.ad_type_details||{}, productPhotoSrcs:r.product_photo_srcs||[],
        rejectReason:r.reject_reason||''
      }; });
    }
  } catch(e) {
    console.error('[sbLoadAll] requests 로드 실패:', e?.message || e);
  }

  return true;
}

async function sbSaveSub(sub) {
  try {
    if(sub.id && sub.id < 1000) {
      const res = await sb.from('subs').insert({main_cat:sub.mainCat, name:sub.name}).select().single();
      if(res.error) throw res.error;
      sub.id = res.data.id;
    }
  } catch(e) { console.warn('sbSaveSub error:', e); }
}

async function sbDeleteSub(id) {
  try { await sb.from('subs').delete().eq('id', id); } catch(e) { console.warn(e); }
}

async function sbSaveProd(prod) {
  try {
    const res = await sb.from('products').insert({main_cat:prod.mainCat, sub_cat:prod.subCat, name:prod.name}).select().single();
    if(res.error) throw res.error;
    prod.id = res.data.id;
  } catch(e) { console.warn('sbSaveProd error:', e); }
}

async function sbDeleteProd(id) {
  try { await sb.from('products').delete().eq('id', id); } catch(e) { console.warn(e); }
}

async function sbUpdateProd(prod) {
  try {
    await sb.from('products').update({main_cat:prod.mainCat, sub_cat:prod.subCat, name:prod.name}).eq('id', prod.id);
  } catch(e) { console.warn('sbUpdateProd error:', e); }
}

async function sbConvertProdToSub(prod) {
  // 상품을 세부 카테고리로 변환: products에서 삭제 후 subs에 추가
  try {
    await sb.from('products').delete().eq('id', prod.id);
    const res = await sb.from('subs').insert({main_cat:prod.mainCat, name:prod.name}).select().single();
    if(res.error) throw res.error;
    return res.data.id;
  } catch(e) { console.warn('sbConvertProdToSub error:', e); return null; }
}

async function sbSaveAd(ad) {
  // types에 base64가 남아있으면 Supabase JSONB에 저장 실패하므로 제거 후 시도
  var typesForDB = (ad.types||[]).map(function(t) {
    return {name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'',
            src: (t.src && t.src.startsWith('data:')) ? '__pending__' : (t.src||'')};
  });
  // 전체 컬럼 시도
  try {
    const res = await sb.from('ads').insert({
      main_cat:ad.mainCat, sub_cat:ad.subCat, product:ad.product,
      title:ad.title, ad_date:ad.adDate, types:typesForDB, memo:ad.memo||'',
      setting_photos:(ad.settingPhotos||[]).map(function(p){
        return {src:(typeof p==='object'?p.src:p)||'', storeName:(typeof p==='object'?p.storeName:'')||''};
      }),
      order_amount:ad.orderAmount||''
    }).select('id').single();
    if(!res.error && res.data) {
      ad.id = res.data.id;
      console.log('[sbSaveAd] 저장 성공, id:', ad.id);
      return true;
    }
    console.warn('[sbSaveAd] 1차 실패:', res.error?.message);
  } catch(e) { console.warn('[sbSaveAd] 1차 예외:', e); }

  // 기본 컬럼만 fallback
  try {
    const res2 = await sb.from('ads').insert({
      main_cat:ad.mainCat, sub_cat:ad.subCat, product:ad.product,
      title:ad.title, ad_date:ad.adDate, types:typesForDB, memo:ad.memo||''
    }).select('id').single();
    if(!res2.error && res2.data) {
      ad.id = res2.data.id;
      console.log('[sbSaveAd] fallback 저장 성공, id:', ad.id);
      return true;
    }
    console.error('[sbSaveAd] fallback도 실패:', res2.error?.message);
  } catch(e2) { console.error('[sbSaveAd] fallback 예외:', e2); }

  return false; // 저장 실패 명시적 반환
}

async function sbUpdateAd(ad) {
  if(!ad.id) { console.warn('[sbUpdateAd] id 없음, 저장 불가'); return false; }
  var typesForDB = (ad.types||[]).map(function(t) {
    return {name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'',
            src: (t.src && t.src.startsWith('data:')) ? '__pending__' : (t.src||'')};
  });
  try {
    var res = await sb.from('ads').update({
      main_cat:ad.mainCat, sub_cat:ad.subCat, product:ad.product,
      title:ad.title, ad_date:ad.adDate, types:typesForDB, memo:ad.memo||'',
      setting_photos:(ad.settingPhotos||[]).map(function(p){
        return {src:(typeof p==='object'?p.src:p)||'', storeName:(typeof p==='object'?p.storeName:'')||''};
      }),
      order_amount:ad.orderAmount||''
    }).eq('id', ad.id);
    if(!res.error) { console.log('[sbUpdateAd] 업데이트 성공, id:', ad.id); return true; }
    console.warn('[sbUpdateAd] 1차 실패:', res.error?.message);
  } catch(e) { console.warn('[sbUpdateAd] 1차 예외:', e); }

  // fallback
  try {
    await sb.from('ads').update({
      main_cat:ad.mainCat, sub_cat:ad.subCat, product:ad.product,
      title:ad.title, ad_date:ad.adDate, types:typesForDB, memo:ad.memo||''
    }).eq('id', ad.id);
    console.log('[sbUpdateAd] fallback 성공');
    return true;
  } catch(e2) { console.error('[sbUpdateAd] fallback 실패:', e2); }
  return false;
}

async function sbDeleteAd(id) {
  try { await sb.from('ads').delete().eq('id', id); } catch(e) { console.warn(e); }
}

async function sbSaveRequest(req) {
  // 전체 필드로 시도
  const fullData = {
    req_code:req.reqCode, submitted_at:req.submittedAt, status:req.status,
    dept:req.dept, name:req.name, tel:req.tel, title:req.title, deadline:req.deadline,
    ad_types:req.adTypes, banner_type:req.bannerType||'', custom_size:req.customSize||'',
    ad_title:req.adTitle, selling:req.selling, event_start:req.eventStart||'', event_end:req.eventEnd||'',
    event_desc:req.eventDesc, site_photo_srcs:req.sitePhotoSrcs||[], ref_image_srcs:req.refImageSrcs||[],
    manager:req.manager||'', due_date:req.dueDate||'',
    branch:req.branch||'', delivery_day:req.deliveryDay||'',
    ad_type_details:req.adTypeDetails||{}, product_photo_srcs:req.productPhotoSrcs||[]
  };
  // 기본 필드만 (컬럼 없을 때 fallback)
  const baseData = {
    req_code:req.reqCode, submitted_at:req.submittedAt, status:req.status,
    dept:req.dept, name:req.name, tel:req.tel, title:req.title, deadline:req.deadline,
    ad_types:req.adTypes, banner_type:req.bannerType||'', custom_size:req.customSize||'',
    ad_title:req.adTitle, selling:req.selling, event_start:req.eventStart||'', event_end:req.eventEnd||'',
    event_desc:req.eventDesc, site_photo_srcs:req.sitePhotoSrcs||[], ref_image_srcs:req.refImageSrcs||[],
    manager:req.manager||'', due_date:req.dueDate||''
  };

  try {
    var res = await sb.from('requests').insert(fullData).select().single();
    if(res.error) {
      // 컬럼 없음 오류면 기본 필드로 재시도
      console.warn('Full insert failed, trying base fields:', res.error.message);
      res = await sb.from('requests').insert(baseData).select().single();
    }
    if(res.error) throw res.error;
    req.id = res.data.id;
    return true;
  } catch(e) {
    console.warn('sbSaveRequest error:', e);
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#e03333;color:#fff;padding:12px 24px;border-radius:50px;font-size:13px;font-weight:600;z-index:9999;font-family:Pretendard,sans-serif;';
    t.textContent = '⚠️ 서버 저장 실패 — 잠시 후 다시 시도해주세요';
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 4000);
    return false;
  }
}

async function sbUpdateRequest(id, fields) {
  try {
    var update = {};
    if(fields.status !== undefined) update.status = fields.status;
    if(fields.manager !== undefined) update.manager = fields.manager;
    if(fields.dueDate !== undefined) update.due_date = fields.dueDate;
    if(fields.rejectReason !== undefined) update.reject_reason = fields.rejectReason;
    await sb.from('requests').update(update).eq('id', id);
  } catch(e) { console.warn('sbUpdateRequest error:', e); }
}

async function sbDeleteRequest(id) {
  try { await sb.from('requests').delete().eq('id', id); } catch(e) { console.warn(e); }
}

async function compressImage(base64DataUrl, maxWidth, quality) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var w = img.width;
      var h = img.height;
      // maxWidth 초과 시 비율 유지하며 축소
      if(w > maxWidth) {
        h = Math.round(h * maxWidth / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { resolve(base64DataUrl); }; // 실패 시 원본 유지
    img.src = base64DataUrl;
  });
}

async function uploadImageToStorage(base64DataUrl, fileName) {
  // 업로드 전 이미지 압축 (최대 1800px, 품질 0.82) → 용량 대폭 감소
  try {
    base64DataUrl = await compressImage(base64DataUrl, 1800, 0.82);
  } catch(e) {
    console.warn('[Storage] 압축 실패, 원본 사용:', e);
  }
  // 최대 2회 재시도
  for(var attempt = 0; attempt < 2; attempt++) {
    try {
      var arr = base64DataUrl.split(',');
      var mime = arr[0].match(/:(.*?);/)[1];
      var bstr = atob(arr[1]);
      var n = bstr.length;
      var u8arr = new Uint8Array(n);
      while(n--) { u8arr[n] = bstr.charCodeAt(n); }
      var blob = new Blob([u8arr], {type: mime});
      // HEIC/HEIF → jpeg 강제 변환
      if(mime === 'image/heic' || mime === 'image/heif') mime = 'image/jpeg';
      var ext = mime.split('/')[1] || 'jpg';
      if(ext === 'jpeg') ext = 'jpg';
      var safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g,'_');
      var path = 'ads/' + safeName + '_' + Date.now() + (attempt > 0 ? '_r' + attempt : '') + '.' + ext;
      var res = await sb.storage.from('images').upload(path, blob, {contentType: mime, upsert: true, cacheControl: '31536000'});
      if(res.error) throw res.error;
      var urlRes = sb.storage.from('images').getPublicUrl(path);
      console.log('[Storage] 업로드 성공:', path);
      return urlRes.data.publicUrl;
    } catch(e) {
      console.warn('[Storage] 업로드 실패 (시도 ' + (attempt+1) + '):', e);
      if(attempt < 1) await new Promise(r => setTimeout(r, 1000)); // 1초 대기 후 재시도
    }
  }
  console.error('[Storage] 최종 업로드 실패 - 이미지를 저장할 수 없습니다');
  return null;
}

async function processAdTypes(types) {
  var result = [];
  var failedUploads = [];
  for(var i=0; i<types.length; i++) {
    var t = types[i];
    if(t.src && t.src.startsWith('data:')) {
      var url = await uploadImageToStorage(t.src, 'ad_' + (t.name||'type').replace(/[^a-zA-Z0-9]/g,'_'));
      if(url) {
        // 업로드 성공 → Storage URL 사용
        result.push({name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'', src: url});
      } else {
        // 업로드 실패 → base64 원본 유지 (Supabase 저장 실패해도 localStorage엔 보존)
        failedUploads.push(t.name || ('타입' + (i+1)));
        result.push({name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'', src: t.src});
      }
    } else {
      result.push({name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'', src: t.src||''});
    }
  }
  if(failedUploads.length > 0) {
    console.error('[processAdTypes] Storage 업로드 실패 타입:', failedUploads);
    // 전역 플래그로 aiConfirm에서 감지
    window._uploadFailed = failedUploads;
  } else {
    window._uploadFailed = null;
  }
  return result;
}

async function processRequestFiles(srcs, prefix) {
  var result = [];
  for(var i=0; i<srcs.length; i++) {
    if(srcs[i] && srcs[i].startsWith('data:')) {
      var url = await uploadImageToStorage(srcs[i], prefix + '_' + i);
      result.push(url || srcs[i]);
    } else {
      result.push(srcs[i]);
    }
  }
  return result;
}



async function processRequestFiles(srcs, prefix) {
  var result = [];
  for(var i=0; i<srcs.length; i++) {
    if(srcs[i] && srcs[i].startsWith('data:')) {
      var url = await uploadImageToStorage(srcs[i], prefix + '_' + i);
      result.push(url || srcs[i]);
    } else {
      result.push(srcs[i]);
    }
  }
  return result;
}

// ==========================================
// 외부 API 연동 기능 (AI 카피 추천 등)
// ==========================================

// AI 카피 문구 생성 요청
async function fetchAiCopy(keyword) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=여기에_API_키_입력`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `너는 킴스클럽의 전문 카피라이터야. 마트 매대 POP 및 포스터에 들어갈 세련되고 직관적인 셀링 문구 3가지를 추천해줘.
사용자가 입력한 상품/키워드: "${keyword}"
규칙:
1. 각 문구는 20자 이내로 짧고 강렬하게 작성할 것.
2. 확인되지 않은 구체적인 수치는 절대 사용하지 말고 감각적인 표현 위주로 작성할 것.
3. 번호나 특수기호를 매기지 말고 텍스트만 줄바꿈으로 구분해서 딱 3줄만 출력해줘.`
          }]
        }]
      })
    });
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const copies = text.split('\n').filter(line => line.trim() !== '');
    return copies;
  } catch (err) {
    console.error('AI 카피 생성 에러:', err);
    return null;
  }
}
