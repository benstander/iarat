import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { generateVideoScript } from './script-generation';

// Helper function to clean JSON response from markdown
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  return cleaned;
}

export interface TopicSummary {
  topicTitle: string;
  script: string;
  topicIndex: number;
}

interface ProcessTopicsParams {
  textContent: string;
  brainrotStyle?: string;
  videoStyle?: 'brainrot' | 'academic' | 'unhinged';
  contentType?: 'PDF' | 'YouTube';
}

export async function processTextIntoTopics({
  textContent,
  brainrotStyle = 'engaging and modern',
  videoStyle = 'brainrot',
  contentType = 'PDF'
}: ProcessTopicsParams): Promise<TopicSummary[]> {
  
  console.log('Extracted text length:', textContent.length);
  console.log('Video style:', videoStyle);

  if (!textContent || textContent.trim().length === 0) {
    throw new Error(`No text could be extracted from the ${contentType.toLowerCase()}`);
  }

  // Step 1: Split text into topics using ChatGPT
  console.log('Splitting text into topics...');
  const topicsResult = await generateText({
    model: openai('gpt-4o'),
    prompt: `
      Split the following ${contentType.toLowerCase()} content into 3-7 distinct topics or sections. 
      Each topic should have a clear title and contain the relevant content from the original text.
      
      Return ONLY a valid JSON array in this exact format:
      [
        {
          "title": "Topic Title",
          "content": "Relevant content from the original text for this topic"
        }
      ]
      
      Content to analyze:
      ${textContent}
    `,
    maxTokens: 2000,
  });

  const topicsJson = topicsResult.text;
  console.log('Raw topics response:', topicsJson);

  // Parse topics with improved error handling
  let topics;
  try {
    const cleanedJson = cleanJsonResponse(topicsJson);
    topics = JSON.parse(cleanedJson);
  } catch (parseError) {
    console.error('Failed to parse topics JSON:', parseError);
    console.log('Cleaned topics response:', cleanJsonResponse(topicsJson));
    
    // Fallback: treat entire text as one topic
    const fallbackTitle = contentType === 'PDF' ? 'Document Summary' : 'Video Summary';
    topics = [{
      title: fallbackTitle,
      content: textContent.substring(0, 2000) // Limit content length
    }];
  }

  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error('Failed to split text into topics');
  }

  console.log(`Successfully split into ${topics.length} topics`);

  // Step 2: Generate scripts for each topic using the shared utility
  const summaries: TopicSummary[] = [];
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`Generating script for topic ${i + 1}: ${topic.title} (style: ${videoStyle})`);
    
    try {
      // Use the shared script generation utility with video style
      const script = await generateVideoScript({
        textContent: `${topic.title}: ${topic.content}`,
        brainrotStyle,
        videoStyle
      });

      summaries.push({
        topicTitle: topic.title,
        script: script,
        topicIndex: i + 1
      });
      
    } catch (scriptError) {
      console.error(`Error generating script for topic ${i + 1}:`, scriptError);
      // Add a fallback summary
      summaries.push({
        topicTitle: topic.title,
        script: `This topic covers ${topic.title}. ${topic.content.substring(0, 150)}...`,
        topicIndex: i + 1
      });
    }
  }

  console.log(`Generated ${summaries.length} summaries with ${videoStyle} style`);
  return summaries;
} 