const sgMail = require('@sendgrid/mail');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, reqCode, name, title, status, rejectReason } = req.body;
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const FROM = 'kimsclub_design@eland.co.kr';
  const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean);

  try {
    if (type === 'applicant_received') {
      await sgMail.send({
        from: FROM,
        to: [to],
        subject: `[킴스클럽] 광고 신청이 접수되었습니다 (${reqCode})`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;"><h2 style="color:#006341;">광고 신청 접수 완료</h2><p>${name}님, 광고 신청이 정상적으로 접수되었습니다.</p><div style="background:#f2f2f2;border-radius:8px;padding:16px;margin:20px 0;"><div style="font-size:12px;color:#999;">신청 번호</div><div style="font-size:20px;font-weight:700;">${reqCode}</div></div><div style="background:#f8f8f8;border-radius:8px;padding:16px;"><div style="font-size:12px;color:#999;">신청 내용</div><div style="font-size:15px;font-weight:600;">${title}</div></div><p style="color:#888;font-size:13px;margin-top:20px;">신청 현황은 홈 화면의 <strong>신청 현황 조회</strong>에서 연락처로 확인하실 수 있습니다.</p></div>`
      });
    } else if (type === 'applicant_status') {
      const statusColors = { '진행 중': '#3B82F6', '완료': '#006341', '반려': '#EF4444' };
      const sc = statusColors[status] || '#111';
      const rejectBlock = (status === '반려' && rejectReason) ? `<div style="background:#fff0f0;padding:14px;color:#e03333;font-size:13px;border-radius:8px;margin:12px 0;"><strong>반려 사유:</strong> ${rejectReason}</div>` : '';
      await sgMail.send({
        from: FROM,
        to: [to],
        subject: `[킴스클럽] 신청 상태가 변경되었습니다 — ${status} (${reqCode})`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;"><h2 style="color:#006341;">신청 상태 업데이트</h2><p>${name}님의 광고 신청 상태가 변경되었습니다.</p><div style="background:#f2f2f2;border-radius:8px;padding:16px;margin:20px 0;"><span style="background:${sc};color:#fff;padding:6px 16px;border-radius:50px;font-weight:700;">${status}</span><div style="margin-top:12px;font-size:16px;font-weight:700;">${reqCode}</div></div>${rejectBlock}<p style="color:#888;font-size:13px;">자세한 현황은 홈 화면의 <strong>신청 현황 조회</strong>에서 확인하세요.</p></div>`
      });
    } else if (type === 'admin_new') {
      if (ADMIN_EMAILS.length === 0) return res.status(200).json({ ok: true, skipped: 'no admin email' });
      await sgMail.send({
        from: FROM,
        to: ADMIN_EMAILS,
        subject: `[킴스클럽] 새 광고 신청이 접수되었습니다 (${reqCode})`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;"><h2 style="color:#006341;">새 광고 신청 접수</h2><div style="background:#f2f2f2;border-radius:8px;padding:16px;margin:20px 0;"><div style="font-size:12px;color:#999;">신청 번호</div><div style="font-size:20px;font-weight:700;">${reqCode}</div></div><div style="background:#f8f8f8;border-radius:8px;padding:14px;"><div style="font-size:12px;color:#999;">신청자</div><div style="font-size:14px;font-weight:600;">${name}</div><div style="font-size:13px;color:#777;margin-top:6px;">${title}</div></div><p style="color:#888;font-size:13px;margin-top:20px;">관리자 모드 → 광고 신청서 관리에서 확인하세요.</p></div>`
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email send error:', err);
    console.error('Error details:', JSON.stringify(err.response?.body?.errors));
    return res.status(500).json({ error: err.message, details: err.response?.body?.errors });
  }
};
