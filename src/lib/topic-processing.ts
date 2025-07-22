import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { generateVideoScript } from './script-generation';
import { TopicSummary } from '@/components/states/types';

// Clean JSON response to handle potential formatting issues
function cleanJsonResponse(jsonText: string): string {
  // Remove any non-JSON content before and after the JSON array
  const jsonStart = jsonText.indexOf('[');
  const jsonEnd = jsonText.lastIndexOf(']');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No valid JSON array found in response');
  }
  
  return jsonText.substring(jsonStart, jsonEnd + 1);
}

interface ProcessTopicsParams {
  textContent: string;
  contentType?: string;
}

export async function processTextIntoTopics({
  textContent,
  contentType = 'PDF'
}: ProcessTopicsParams): Promise<TopicSummary[]> {
  
  console.log('Extracted text length:', textContent.length);
  console.log('Processing content type:', contentType);

  if (!textContent || textContent.trim().length === 0) {
    throw new Error(`No text could be extracted from the ${contentType.toLowerCase()}`);
  }

  // Step 1: Split text into topics using ChatGPT
  console.log('Splitting text into topics...');
  const topicsResult = await generateText({
    model: openai('gpt-4o'),
    prompt: `
      Split the following ${contentType.toLowerCase()} content into 3-7 distinct topics or sections. 
      Each topic should have a clear title and contain the most relevant content from the original text.
      For long content, summarize key points rather than including everything verbatim.
      
      Return ONLY a valid JSON array in this exact format (ensure proper JSON syntax):
      [
        {
          "title": "Clear Topic Title",
          "content": "Key points and relevant content for this topic (2-3 sentences max)"
        }
      ]
      
      IMPORTANT: Ensure the JSON is properly formatted and complete. Do not truncate mid-sentence.
      
      Content to analyze:
      ${textContent}
    `,
    maxTokens: 4000, // Increased for longer videos
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

  // Step 2: Return topics WITHOUT generating scripts yet
  // Scripts will be generated later when user selects voice style
  const summaries: TopicSummary[] = [];
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`Preparing topic ${i + 1}: ${topic.title}`);
    
    summaries.push({
      topicTitle: topic.title,
      content: topic.content,
      topicIndex: i + 1
      // No script generated here - will be done later with user's voice style
    });
  }

  console.log(`Prepared ${summaries.length} topic summaries (scripts will be generated when user selects voice style)`);
  return summaries;
}

// New function to generate script for a specific topic with voice options
export async function generateScriptForTopic(
  topicSummary: TopicSummary, 
  voiceStyle: 'academic' | 'brainrot' | 'unhinged' = 'brainrot',
  videoDialogue?: 'explainer' | 'debater' | 'socratic' | 'narrative' | 'examples' | 'quiz' | null
): Promise<string> {
  console.log(`Generating script for topic: ${topicSummary.topicTitle} with voice style: ${voiceStyle} and dialogue: ${videoDialogue}`);
  
  const script = await generateVideoScript({
    textContent: `${topicSummary.topicTitle}: ${topicSummary.content}`,
    videoStyle: voiceStyle,
    videoDialogue: videoDialogue
  });

  return script;
} 