// Shared utility helpers

function formatTelInput(el) {
  var v = el.value.replace(/[^0-9]/g,'');
  if(v.length <= 3) el.value = v;
  else if(v.length <= 7) el.value = v.slice(0,3) + '-' + v.slice(3);
  else el.value = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7,11);
}
