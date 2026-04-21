const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: '상품명이 필요합니다.' });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `너는 킴스클럽의 전문 카피라이터야. 마트 매대 POP 및 포스터에 들어갈 세련되고 직관적인 셀링 문구 3가지를 추천해줘.
사용자가 입력한 상품/키워드: "${keyword}"
규칙:
1. 각 문구는 20자 이내로 짧고 강렬하게 작성할 것.
2. 확인되지 않은 구체적인 수치는 절대 사용하지 말고 감각적인 표현 위주로 작성할 것.
3. 번호나 특수기호를 매기지 말고 텍스트만 줄바꿈으로 구분해서 딱 3줄만 출력해줘.`
      });
      const text = response.text;
      const copies = text.split('\n').filter(line => line.trim() !== '');
      return res.status(200).json({ copies });
    } catch (error) {
      if (error.status === 503 && attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error('AI Copy Generation Error:', error);
      return res.status(500).json({ error: '문구 생성에 실패했습니다.' });
    }
  }
};
