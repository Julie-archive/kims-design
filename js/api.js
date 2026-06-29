// Firebase API helpers

// ── Firebase 초기화 대기 ──
function waitForFirebase() {
  return new Promise(function(resolve) {
    if(window.db && window.storage) { resolve(); return; }
    var interval = setInterval(function() {
      if(window.db && window.storage) { clearInterval(interval); resolve(); }
    }, 50);
  });
}

// ── Firestore 동기화 함수 ──
async function sbLoadAll() {
  await waitForFirebase();
  var { collection, getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try {
    var db = window.db;
    var [subsSnap, prodsSnap, adsSnap] = await Promise.all([
      getDocs(query(collection(db, 'subs'), orderBy('id'))),
      getDocs(query(collection(db, 'products'), orderBy('id'))),
      getDocs(query(collection(db, 'ads'), orderBy('id')))
    ]);
    DB.subs = subsSnap.docs.map(function(d){ var r=d.data(); return {id:r.id, mainCat:r.mainCat, name:r.name}; });
    DB.products = prodsSnap.docs.map(function(d){ var r=d.data(); return {id:r.id, mainCat:r.mainCat, subCat:r.subCat, name:r.name}; });
    DB.ads = adsSnap.docs.map(function(d){ var r=d.data(); return {id:r.id, mainCat:r.mainCat, subCat:r.subCat, product:r.product, title:r.title, adDate:r.adDate, types:r.types||[], memo:r.memo||'', settingPhotos:r.settingPhotos||[], orderAmount:r.orderAmount||''}; });
    saveData();
  } catch(e) {
    console.warn('Firestore load failed:', e);
    return false;
  }

  try {
    var { query: q2, orderBy: ob2 } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
    var reqsSnap = await getDocs(query(collection(db, 'requests'), orderBy('submittedAt', 'desc')));
    DB.requests = reqsSnap.docs.map(function(d){ var r=d.data(); return {
      id:r.id, reqCode:r.reqCode, submittedAt:r.submittedAt, status:r.status,
      dept:r.dept, name:r.name, tel:r.tel, title:r.title, deadline:r.deadline,
      adTypes:r.adTypes||[], bannerType:r.bannerType||'', customSize:r.customSize||'',
      adTitle:r.adTitle, selling:r.selling, eventStart:r.eventStart||'', eventEnd:r.eventEnd||'',
      eventDesc:r.eventDesc, sitePhotoSrcs:r.sitePhotoSrcs||[], refImageSrcs:r.refImageSrcs||[],
      manager:r.manager||'', dueDate:r.dueDate||'',
      branch:r.branch||'', deliveryDay:r.deliveryDay||'',
      adTypeDetails:r.adTypeDetails||{}, productPhotoSrcs:r.productPhotoSrcs||[],
      rejectReason:r.rejectReason||'', email:r.email||''
    }; });
  } catch(e) {
    console.error('requests 로드 실패:', e);
  }
  return true;
}

async function sbSaveSub(sub) {
  await waitForFirebase();
  var { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try {
    await setDoc(doc(window.db, 'subs', String(sub.id)), {id:sub.id, mainCat:sub.mainCat, name:sub.name});
  } catch(e) { console.warn('sbSaveSub error:', e); }
}

async function sbDeleteSub(id) {
  await waitForFirebase();
  var { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try { await deleteDoc(doc(window.db, 'subs', String(id))); } catch(e) { console.warn(e); }
}

async function sbSaveProd(prod) {
  await waitForFirebase();
  var { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try {
    await setDoc(doc(window.db, 'products', String(prod.id)), {id:prod.id, mainCat:prod.mainCat, subCat:prod.subCat, name:prod.name});
  } catch(e) { console.warn('sbSaveProd error:', e); }
}

async function sbDeleteProd(id) {
  await waitForFirebase();
  var { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try { await deleteDoc(doc(window.db, 'products', String(Number(id)))); } catch(e) { console.warn(e); }
}

async function sbUpdateProd(prod) {
  await waitForFirebase();
  var { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try {
    await updateDoc(doc(window.db, 'products', String(prod.id)), {mainCat:prod.mainCat, subCat:prod.subCat, name:prod.name});
  } catch(e) { console.warn('sbUpdateProd error:', e); }
}

async function sbConvertProdToSub(prod) {
  await waitForFirebase();
  var { doc, deleteDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try {
    await deleteDoc(doc(window.db, 'products', String(prod.id)));
    var newId = nextId();
    await setDoc(doc(window.db, 'subs', String(newId)), {id:newId, mainCat:prod.mainCat, name:prod.name});
    return newId;
  } catch(e) { console.warn('sbConvertProdToSub error:', e); return null; }
}

async function sbSaveAd(ad) {
  await waitForFirebase();
  var { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  var typesForDB = (ad.types||[]).map(function(t) {
    return {name:t.name||'', subtitle:t.subtitle||'', width:t.width||'', height:t.height||'', memo:t.memo||'', unitPrice:t.unitPrice||'',
            src: (t.src && t.src.startsWith('data:')) ? '__pending__' : (t.src||'')};
  });
  try {
    await setDoc(doc(window.db, 'ads', String(ad.id)), {
      id:ad.id, mainCat:ad.mainCat, subCat:ad.subCat, product:ad.product,
      title:ad.title, adDate:ad.adDate, types:typesForDB, memo:ad.memo||'',
      settingPhotos:(ad.settingPhotos||[]).map(function(p){
        return {src:(typeof p==='object'?p.src:p)||'', storeName:(typeof p==='object'?p.storeName:'')||''};
      }),
      orderAmount:ad.orderAmount||''
    });
    console.log('[sbSaveAd] 저장 성공, id:', ad.id);
    return true;
  } catch(e) { console.error('[sbSaveAd] 실패:', e); return false; }
}

async function sbUpdateAd(ad) {
  await waitForFirebase();
  var { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  if(!ad.id) return false;
  var typesForDB = (ad.types||[]).map(function(t) {
    return {name:t.name||'', subtitle:t.subtitle||'', width:t.width||'', height:t.height||'', memo:t.memo||'', unitPrice:t.unitPrice||'',
            src: (t.src && t.src.startsWith('data:')) ? '__pending__' : (t.src||'')};
  });
  try {
    await updateDoc(doc(window.db, 'ads', String(ad.id)), {
      mainCat:ad.mainCat, subCat:ad.subCat, product:ad.product,
      title:ad.title, adDate:ad.adDate, types:typesForDB, memo:ad.memo||'',
      settingPhotos:(ad.settingPhotos||[]).map(function(p){
        return {src:(typeof p==='object'?p.src:p)||'', storeName:(typeof p==='object'?p.storeName:'')||''};
      }),
      orderAmount:ad.orderAmount||''
    });
    return true;
  } catch(e) { console.error('[sbUpdateAd] 실패:', e); return false; }
}

async function sbDeleteAd(id) {
  await waitForFirebase();
  var { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try { await deleteDoc(doc(window.db, 'ads', String(Number(id)))); } catch(e) { console.warn(e); }
}

async function sbSaveRequest(req) {
  await waitForFirebase();
  var { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try {
    await setDoc(doc(window.db, 'requests', String(req.id)), {
      id:req.id, reqCode:req.reqCode||'', submittedAt:req.submittedAt, status:req.status,
      dept:req.dept, name:req.name, tel:req.tel, title:req.title, deadline:req.deadline||'',
      adTypes:req.adTypes||[], bannerType:req.bannerType||'', customSize:req.customSize||'',
      adTitle:req.adTitle||'', selling:req.selling||'', eventStart:req.eventStart||'', eventEnd:req.eventEnd||'',
      eventDesc:req.eventDesc||'', sitePhotoSrcs:req.sitePhotoSrcs||[], refImageSrcs:req.refImageSrcs||[],
      manager:req.manager||'', dueDate:req.dueDate||'',
      branch:req.branch||'', deliveryDay:req.deliveryDay||'',
      adTypeDetails:req.adTypeDetails||{}, productPhotoSrcs:req.productPhotoSrcs||[],
      rejectReason:req.rejectReason||'', email:req.email||''
    });
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
  await waitForFirebase();
  var { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try {
    var update = {};
    if(fields.status !== undefined) update.status = fields.status;
    if(fields.manager !== undefined) update.manager = fields.manager;
    if(fields.dueDate !== undefined) update.dueDate = fields.dueDate;
    if(fields.rejectReason !== undefined) update.rejectReason = fields.rejectReason;
    await updateDoc(doc(window.db, 'requests', String(id)), update);
  } catch(e) { console.warn('sbUpdateRequest error:', e); }
}

async function sbDeleteRequest(id) {
  await waitForFirebase();
  var { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  try { await deleteDoc(doc(window.db, 'requests', String(Number(id)))); } catch(e) { console.warn(e); }
}

async function compressImage(base64DataUrl, maxWidth, quality) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var w = img.width, h = img.height;
      if(w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { resolve(base64DataUrl); };
    img.src = base64DataUrl;
  });
}

async function uploadImageToStorage(base64DataUrl, fileName) {
  await waitForFirebase();
  var { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js");
  try {
    base64DataUrl = await compressImage(base64DataUrl, 1800, 0.82);
  } catch(e) { console.warn('[Storage] 압축 실패:', e); }

  for(var attempt = 0; attempt < 2; attempt++) {
    try {
      var arr = base64DataUrl.split(',');
      var mime = arr[0].match(/:(.*?);/)[1];
      var bstr = atob(arr[1]);
      var n = bstr.length;
      var u8arr = new Uint8Array(n);
      while(n--) { u8arr[n] = bstr.charCodeAt(n); }
      var blob = new Blob([u8arr], {type: mime});
      var ext = mime.split('/')[1] || 'jpg';
      if(ext === 'jpeg') ext = 'jpg';
      var safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
      var path = 'ads/' + safeName + '_' + Date.now() + '.' + ext;
      var storageRef = ref(window.storage, path);
      await uploadBytes(storageRef, blob, {contentType: mime});
      var url = await getDownloadURL(storageRef);
      console.log('[Storage] 업로드 성공:', path);
      return url;
    } catch(e) {
      console.warn('[Storage] 업로드 실패 (시도 ' + (attempt+1) + '):', e);
      if(attempt < 1) await new Promise(r => setTimeout(r, 1000));
    }
  }
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
        result.push({name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'', src: url});
      } else {
        failedUploads.push(t.name || ('타입' + (i+1)));
        result.push({name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'', src: t.src});
      }
    } else {
      result.push({name:t.name, subtitle:t.subtitle||'', width:t.width, height:t.height, memo:t.memo||'', unitPrice:t.unitPrice||'', src: t.src||''});
    }
  }
  if(failedUploads.length > 0) { window._uploadFailed = failedUploads; }
  else { window._uploadFailed = null; }
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

async function fetchAiCopy(keyword) {
  try {
    var response = await fetch('https://kims-design.vercel.app/api/generate-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword })
    });
    var data = await response.json();
    return (response.ok && data.copies) ? data.copies : null;
  } catch(err) {
    console.error('AI 카피 생성 에러:', err);
    return null;
  }
}
