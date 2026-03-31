// Shared utility helpers

// 입력값의 HTML 태그를 무력화하여 XSS 공격을 방어하는 유틸리티 함수
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTelInput(el) {
  var v = el.value.replace(/[^0-9]/g,'');
  if(v.length <= 3) el.value = v;
  else if(v.length <= 7) el.value = v.slice(0,3) + '-' + v.slice(3);
  else el.value = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7,11);
}
