// api/generate-copy.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  // POST 요청만 허용합니다.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: '상품명(키워드)이 필요합니다.' });
  }

  try {
    // Vercel 환경 변수에 등록할 Gemini API 키를 가져옵니다.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // AI에게 내리는 프롬프트 (규칙)
    const prompt = `너는 킴스클럽의 전문 카피라이터야. 마트 매대 POP 및 포스터에 들어갈 세련되고 직관적인 셀링 문구 3가지를 추천해줘.
    사용자가 입력한 상품/키워드: "${keyword}"
    
    규칙:
    1. 각 문구는 20자 이내로 짧고 강렬하게 작성할 것.
    2. 확인되지 않은 구체적인 수치(예: 13 brix 이상, 특정 가격 등)는 절대 사용하지 말고, 감각적인 표현 위주로 작성할 것.
    3. 번호나 특수기호를 매기지 말고, 오직 텍스트만 줄바꿈(\n)으로 구분해서 딱 3줄만 출력해줘.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 줄바꿈을 기준으로 배열로 쪼개어 클라이언트(프론트엔드)로 보냅니다.
    const copies = text.split('\n').filter(line => line.trim() !== '');

    res.status(200).json({ copies });
  } catch (error) {
    console.error('AI Copy Generation Error:', error);
    res.status(500).json({ error: '문구 생성에 실패했습니다.' });
  }
}
