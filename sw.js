// sw.js (가장 기본적인 형태)
self.addEventListener('install', (event) => {
  console.log('서비스 워커 설치 완료');
});

self.addEventListener('fetch', (event) => {
  // 캐싱 로직 등을 여기에 추가하여 로딩 속도를 높일 수 있습니다.
});

// 푸시 알림을 받았을 때 화면에 띄우는 로직
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png'
  };
  event.waitUntil(
    self.registration.showNotification('킴스클럽 광고 알림', options)
  );
});
