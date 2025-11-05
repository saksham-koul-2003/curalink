const OpenAI = require('openai');

// Lazy initialization - only create client when needed and API key exists
let openai = null;

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

async function generateSummary(text, maxLength = 200) {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback to simple truncation if no API key
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  const client = getOpenAIClient();
  if (!client) {
    // Fallback if client creation failed
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a medical communication assistant. Create a comprehensive summary (150-250 words) that includes ALL of the following information from the clinical trial:
- Trial title and description
- Target conditions/diseases
- Clinical trial phase
- Current status (recruiting, completed, etc.)
- Location
- Eligibility criteria
- Progress percentage (if mentioned)
- Contact information (if provided)

Write in clear, professional language that both patients and researchers can understand. Structure the summary to be informative and complete. Include all relevant details provided.`,
        },
        {
          role: 'user',
          content: text.substring(0, 4000), // Limit input length
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to simple truncation
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }
}

async function extractConditionsFromText(text) {
  if (!process.env.OPENAI_API_KEY) {
    // Simple keyword extraction fallback
    const commonConditions = [
      'cancer', 'glioma', 'brain cancer', 'lung cancer', 'heart disease',
      'diabetes', 'covid', 'alzheimer', 'parkinson', 'epilepsy',
    ];
    const lowerText = text.toLowerCase();
    return commonConditions.filter((condition) => lowerText.includes(condition));
  }

  const client = getOpenAIClient();
  if (!client) {
    // Fallback if client creation failed
    const commonConditions = [
      'cancer', 'glioma', 'brain cancer', 'lung cancer', 'heart disease',
      'diabetes', 'covid', 'alzheimer', 'parkinson', 'epilepsy',
    ];
    const lowerText = text.toLowerCase();
    return commonConditions.filter((condition) => lowerText.includes(condition));
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract medical conditions, diseases, or health issues from the following text. Return a JSON array of condition names.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content.trim();
    try {
      return JSON.parse(content);
    } catch {
      // If not valid JSON, try to extract from text
      return content.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return [];
  }
}

module.exports = { generateSummary, extractConditionsFromText };

