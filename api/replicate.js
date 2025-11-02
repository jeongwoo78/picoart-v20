export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, prompt, style } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({ error: 'Missing image or prompt' });
    }

    // XLabs FLUX Depth ControlNet API 호출
    // v16: 검증된 안정적인 모델 (259.5K+ runs)
    // 비용: $0.074/장, 처리시간: ~54초
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.VITE_REPLICATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // XLabs-AI flux-dev-controlnet v3 (Depth, Canny, Soft Edge)
        version: "f2c31c31d81278a91b2447a304dae654c64a5d5a70340fba811bb1cbd41019a2",
        input: {
          prompt: prompt,
          control_image: image,
          control_type: "depth", // 깊이 정보 기반 컨트롤 (구도 유지 최적)
          control_strength: 0.5, // 0.3-0.7 권장 (낮을수록 원본 유지, 높을수록 화풍 강조)
          steps: 28, // 추론 단계 (20-50)
          guidance_scale: 3.5, // 프롬프트 충실도 (2.0-5.0)
          output_format: "jpg",
          output_quality: 90
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error:', response.status, errorText);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
