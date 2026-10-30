import type { DailyCheckIn, ChatMessage, UserSettings, UserProfile } from '../types';

export interface AIReflectionResponse {
  reflection: string;
  suggestedActions: string[];
  tags: string[];
}

export interface AIChatResponse {
  reply: string;
  suggestedActions?: string[];
  followUpSuggestions?: string[];
  emotion: 'calm' | 'empathetic' | 'encouraging' | 'thoughtful' | 'celebratory';
}

const PLUTO_SYSTEM_INSTRUCTION = `You are Pluto, an empathetic, intuitive, highly conversational 3D reflection companion for students.
You talk like a genuinely warm, perceptive, articulate human peer or mentor who cares and actively converses with the student.

CONVERSATIONAL GUIDELINES:
1. Speak in a natural, warm, human conversational tone. Avoid robotic bullet lists or stiff cliches.
2. ALWAYS CONVERSE NATURALLY AND FURTHER: After reflecting on what they said, ask an open-ended, natural, gentle follow-up question that invites them to converse further (e.g. "What part of that project is weighing on you the most?", "Did you manage to take a breather, or did you have to keep pushing?", "How is your focus feeling right now?").
3. Validate their feelings authentically: acknowledge academic stress, sleepiness, or wins without being patronizing.
4. Connect their feelings to their daily rhythm (sleep, workload, pacing) when relevant.
5. NEVER diagnose medical or mental health disorders, and never claim correlation proves causation.
6. Format any optional practical action as "ACTION: [Action Title]" on its own line at the end.
7. Format 2 to 3 natural follow-up options for the student as "FOLLOWUPS: [Reply 1] | [Reply 2] | [Reply 3]" on the final line.`;

/**
 * Generate an AI reflection for a daily check-in
 */
export async function generateCheckInReflection(
  checkIn: DailyCheckIn,
  recentHistory: DailyCheckIn[],
  settings?: UserSettings,
  userProfile?: UserProfile
): Promise<AIReflectionResponse> {
  const apiKey = settings?.geminiApiKey || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const response = await callGeminiAPI(
        `Please reflect on the student's daily check-in below as Pluto, their supportive 3D companion.
Student Context: ${userProfile ? `${userProfile.fullName}, studying ${userProfile.major} at ${userProfile.institution}` : 'Student'}

Provide:
1. A warm, nonjudgmental human reflection (2-3 sentences) acknowledging their mood, sleep, energy, and workload.
2. 2 practical, bite-sized micro-actions for today or tomorrow.
3. 2-3 short keyword tags (e.g. "DeepRest", "ExamPrep", "SleepPriority").

Check-in Data:
- Date: ${checkIn.date}
- Mood: ${checkIn.mood}/5
- Sleep: ${checkIn.sleepHours} hours
- Energy: ${checkIn.energy}/5
- Stress: ${checkIn.stress}/10
- Academic Workload: ${checkIn.workload}
- Journal Note: "${checkIn.journal || 'No note provided'}"
- Recent 3-day Sleep Average: ${getRecentAvgSleep(recentHistory)} hours`,
        apiKey
      );

      if (response) {
        return parseReflectionResponse(response, checkIn);
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to Local Pluto Engine:', err);
    }
  }

  // Built-in Local Pluto Mind Engine
  return generateLocalMindReflection(checkIn, recentHistory);
}

/**
 * Generate a continuous, human-like conversational reply for Pluto
 */
export async function generateCompanionReply(
  userText: string,
  chatHistory: ChatMessage[],
  latestCheckIn?: DailyCheckIn,
  settings?: UserSettings,
  userProfile?: UserProfile
): Promise<AIChatResponse> {
  const apiKey = settings?.geminiApiKey || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const conversationContext = chatHistory
        .slice(-8)
        .map((m) => `${m.sender === 'user' ? (userProfile?.fullName || 'Student') : 'Pluto'}: ${m.text}`)
        .join('\n');

      const checkInContext = latestCheckIn
        ? `Student's Latest Check-in Context:
- Mood: ${latestCheckIn.mood}/5
- Sleep: ${latestCheckIn.sleepHours} hours
- Stress: ${latestCheckIn.stress}/10
- Workload: ${latestCheckIn.workload}
- Target Sleep: ${userProfile?.targetSleepHours || 7.8} hours`
        : 'No recent check-in recorded yet.';

      const prompt = `${PLUTO_SYSTEM_INSTRUCTION}

${userProfile ? `Student Profile: ${userProfile.fullName}, ${userProfile.academicYear} studying ${userProfile.major} at ${userProfile.institution}. Goal: "${userProfile.primaryGoal}".` : ''}
${checkInContext}

Recent Conversation:
${conversationContext}
${userProfile?.fullName || 'Student'}: "${userText}"

Reply as Pluto naturally and humanly. Ask a natural follow-up question to keep the conversation flowing.
ACTION: [Action Title if helpful]
FOLLOWUPS: [Quick Reply 1] | [Quick Reply 2] | [Quick Reply 3]`;

      const response = await callGeminiAPI(prompt, apiKey);
      if (response) {
        let reply = response.trim();
        const suggestedActions: string[] = [];
        let followUpSuggestions: string[] = [];

        // Parse ACTION
        const actionMatch = reply.match(/ACTION:\s*(.+)$/im);
        if (actionMatch) {
          suggestedActions.push(actionMatch[1].trim());
          reply = reply.replace(/ACTION:\s*(.+)$/im, '').trim();
        }

        // Parse FOLLOWUPS
        const followupsMatch = reply.match(/FOLLOWUPS:\s*(.+)$/im);
        if (followupsMatch) {
          const raw = followupsMatch[1].trim();
          followUpSuggestions = raw.split('|').map((s) => s.trim()).filter(Boolean);
          reply = reply.replace(/FOLLOWUPS:\s*(.+)$/im, '').trim();
        }

        const emotion = determineEmotionFromText(reply, userText);
        if (followUpSuggestions.length === 0) {
          followUpSuggestions = getDefaultFollowUps(userText);
        }

        return { reply, suggestedActions, followUpSuggestions, emotion };
      }
    } catch (err) {
      console.warn('Gemini API chat failed, falling back to Local Pluto Engine:', err);
    }
  }

  // Local Pluto Engine with conversational continuation & human-like responses
  return generateLocalPlutoReply(userText, chatHistory, latestCheckIn, settings?.language || 'en-US', userProfile);
}

/**
 * Calls Google Gemini REST endpoint directly
 */
async function callGeminiAPI(promptText: string, apiKey: string): Promise<string | null> {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 700,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        return candidateText;
      }
    } catch (err) {
      console.warn(`Fetch to ${model} failed:`, err);
    }
  }
  return null;
}

function parseReflectionResponse(rawText: string, checkIn: DailyCheckIn): AIReflectionResponse {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const actions: string[] = [];
  const tags: string[] = [];
  let reflection = '';

  for (const line of lines) {
    if (line.toLowerCase().startsWith('action:') || line.startsWith('-') || line.match(/^\d\./)) {
      const cleaned = line.replace(/^(action:|-\s*|\d\.\s*)/i, '').trim();
      if (cleaned.length > 5 && cleaned.length < 120 && actions.length < 2) {
        actions.push(cleaned);
      }
    } else if (line.toLowerCase().includes('tag') || line.startsWith('#')) {
      const matches = line.match(/#?[\w-]+/g);
      if (matches) {
        tags.push(...matches.filter((m) => !m.toLowerCase().includes('tag')).slice(0, 3));
      }
    } else if (!reflection) {
      reflection = line;
    } else if (reflection.length < 320) {
      reflection += ' ' + line;
    }
  }

  if (!reflection) reflection = rawText.slice(0, 350);
  if (actions.length === 0) actions.push('Protect 15 minutes tonight for screen-free winding down.');
  if (tags.length === 0) tags.push(checkIn.workload === 'high' ? 'HighWorkload' : 'SteadyProgress');

  return { reflection, suggestedActions: actions, tags };
}

function getRecentAvgSleep(history: DailyCheckIn[]): number {
  if (history.length === 0) return 7.5;
  const recent = history.slice(-3);
  const sum = recent.reduce((acc, c) => acc + c.sleepHours, 0);
  return Math.round((sum / recent.length) * 10) / 10;
}

function generateLocalMindReflection(checkIn: DailyCheckIn, recentHistory: DailyCheckIn[]): AIReflectionResponse {
  const { mood, sleepHours, energy, stress, workload, journal } = checkIn;
  const recentSleep = getRecentAvgSleep(recentHistory);
  const actions: string[] = [];
  const tags: string[] = [];
  let reflection = '';

  if (sleepHours < 6.0) {
    reflection += `You logged ${sleepHours} hours of sleep, below your recent average of ${recentSleep}h. Noticeable energy dips (reported at ${energy}/5, mood ${mood}/5) are a natural bodily response to sleep debt rather than a lack of willpower. `;
    actions.push('Schedule an earlier bedtime target tonight (wind-down starting 45m before sleep).');
    tags.push('SleepDebt');
  } else if (sleepHours >= 7.5) {
    reflection += `A strong foundation of ${sleepHours} hours of sleep (compared to recent ${recentSleep}h average) supported your mood (${mood}/5). Having consistent sleep duration is frequently associated in your data with sustained attention. `;
    tags.push('Restored');
  } else {
    reflection += `With ${sleepHours} hours of sleep (vs ${recentSleep}h recent) and moderate energy (${energy}/5, mood ${mood}/5), your day found a functional equilibrium. `;
    tags.push('BalancedRhythm');
  }

  if (stress >= 7) {
    reflection += `Your stress was reported at an elevated ${stress}/10 alongside a ${workload} academic workload. Remember to treat your capacity like a battery: high output demands deliberate re-charging intervals rather than marathon cramming. `;
    actions.push('Take a 15-minute screen-free walk or quiet stretch to down-regulate your nervous system.');
    tags.push('HighStress');
  } else if (stress <= 3) {
    reflection += `Reported stress remained pleasantly low (${stress}/10), creating space for calm retention and clear thinking. `;
    tags.push('CalmMind');
  } else {
    reflection += `Stress remained at a manageable ${stress}/10 for your ${workload} workload level. `;
  }

  if (journal && journal.length > 10) {
    const lowerJ = journal.toLowerCase();
    if (lowerJ.includes('exam') || lowerJ.includes('quiz') || lowerJ.includes('test')) {
      actions.push('Break tomorrow’s exam prep into 25-minute Pomodoro sprints with clear micro-goals.');
      tags.push('ExamFocus');
    } else if (lowerJ.includes('tired') || lowerJ.includes('exhausted') || lowerJ.includes('sleepy')) {
      actions.push('Hydrate with a tall glass of water and take 5 deep slow diaphragmatic breaths.');
    }
  }

  if (actions.length === 0) {
    actions.push('Plan tomorrow’s single most important academic priority before going to sleep.');
  }

  return {
    reflection: reflection.trim(),
    suggestedActions: actions.slice(0, 2),
    tags: Array.from(new Set(tags)),
  };
}

/**
 * Intelligent Local Pluto Engine with rich, continuous, human-like dialogue
 */
function generateLocalPlutoReply(
  userText: string,
  chatHistory: ChatMessage[],
  latestCheckIn?: DailyCheckIn,
  language = 'en-US',
  userProfile?: UserProfile
): AIChatResponse {
  const lower = userText.toLowerCase().trim();
  const userName = userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'there';

  // Multilingual quick greeting support
  if (language.startsWith('es')) {
    return {
      reply: `¡Hola ${userName}! Soy Pluto, tu compañero de reflexión 3D. Te escucho con mucha atención. Sé lo demandante que puede ser el ritmo universitario y estoy aquí para acompañarte sin juicios. ¿Cómo te has sentido hoy con tus materias y tu energía?`,
      suggestedActions: ['Hacer una pausa de 5 minutos para respirar profundamente.'],
      followUpSuggestions: ['Siento bastante estrés con los exámenes', 'He dormido poco últimamente', 'Hoy fue un día productivo'],
      emotion: 'empathetic',
    };
  } else if (language.startsWith('fr')) {
    return {
      reply: `Bonjour ${userName} ! Je m’appelle Pluto, votre compagnon de réflexion 3D. Je suis vraiment ravi de discuter avec vous. Les études peuvent être intenses, et je suis là pour vous écouter en toute bienveillance. Comment s'est passée votre journée jusqu'ici ?`,
      suggestedActions: ['Prendre 10 minutes de repos sans écran.'],
      followUpSuggestions: ['Je suis débordé par mes cours', 'Je dors mal en ce moment', 'Tout va plutôt bien aujourd’hui'],
      emotion: 'empathetic',
    };
  } else if (language.startsWith('de')) {
    return {
      reply: `Hallo ${userName}! Ich bin Pluto, dein 3D-Reflexionsbegleiter. Ich freue mich, mit dir zu sprechen. Das Studium kann ganz schön fordernd sein, und ich bin hier, um dir ohne Vorurteile zuzuhören. Wie geht es dir heute mit deiner Energie und deinen Aufgaben?`,
      suggestedActions: ['Eine kurze Pause an der frischen Luft einlegen.'],
      followUpSuggestions: ['Habe viel Prüfungsstress', 'Fühle mich erschöpft', 'Der Tag lief eigentlich ganz gut'],
      emotion: 'empathetic',
    };
  } else if (language.startsWith('hi')) {
    return {
      reply: `नमस्ते ${userName}! मैं प्लूटो (Pluto) हूँ, आपका 3D AI साथी। मैं आपके अध्ययन, नींद और दिनचर्या को गहराई से समझने में आपकी मदद के लिए यहाँ हूँ। आज आप कैसा महसूस कर रहे हैं, और आपके मन में क्या चल रहा है?`,
      suggestedActions: ['5 मिनट गहरी सांस लेने का अभ्यास करें।'],
      followUpSuggestions: ['पढ़ाई का बहुत तनाव है', 'नींद पूरी नहीं हो रही', 'आज का दिन अच्छा रहा'],
      emotion: 'empathetic',
    };
  } else if (language.startsWith('ja')) {
    return {
      reply: `こんにちは、${userName}さん！3DコンパニオンのPluto（プルート）です。大学生活や勉強のペースを整えるお手伝いをします。今日はどんな一日でしたか？どんなことでも気軽に話してくださいね。`,
      suggestedActions: ['10分間画面から離れて目を休める。'],
      followUpSuggestions: ['試験のプレッシャーがつらい', '睡眠不足で集中できない', '今日は割と調子が良い'],
      emotion: 'empathetic',
    };
  }

  // Conversation continuation checks based on chat turn count
  const turnCount = chatHistory.length;

  // 1. Exam & Academic Crunch
  if (lower.includes('exam') || lower.includes('midterm') || lower.includes('finals') || lower.includes('test') || lower.includes('quiz')) {
    return {
      reply: `I completely hear you, ${userName}. Exam blocks create this persistent background tension where it feels like you're never truly off the clock. But remember: cognitive retention actually solidifies during deep rest, not during 2 AM panic reading.\n\nLet's break this down together so it doesn't feel like a giant wall. Which specific exam or subject is creating the heaviest pressure for you right now?`,
      suggestedActions: ['Run a 25-minute single-topic Pomodoro study sprint.'],
      followUpSuggestions: [
        'I have multiple exams back-to-back',
        'I feel behind on the lecture material',
        'Help me set up a realistic study plan for today',
      ],
      emotion: 'encouraging',
    };
  }

  // 2. Tiredness & Sleep Deficit
  if (lower.includes('tired') || lower.includes('sleep') || lower.includes('exhaust') || lower.includes('fatigue') || lower.includes('drained') || lower.includes('heavy')) {
    const sleepNote = latestCheckIn ? `Looking at your recent log, you clocked ${latestCheckIn.sleepHours} hours of sleep. ` : '';
    return {
      reply: `That fatigue is real, ${userName}. ${sleepNote}When your brain feels like it's trudging through thick fog, it isn't a lack of discipline—it's your physiology waving a flag saying your battery is drained. Trying to force high-level analytical work through that state usually just creates frustration.\n\nCan you give yourself permission for a 15-minute physical reset right now—maybe step away from screens, get some cold water, or just stretch? Or are you under an urgent deadline where you have to keep moving?`,
      suggestedActions: ['Step away from screens for a 15-minute nervous system reset.'],
      followUpSuggestions: [
        'I have a deadline in a few hours, I need to push through',
        'I can take a 15-minute break right now',
        'Why do I still feel tired even when I slept?',
      ],
      emotion: 'empathetic',
    };
  }

  // 3. Stress, Anxiety & Overwhelm
  if (lower.includes('stress') || lower.includes('overwhelm') || lower.includes('anxious') || lower.includes('panic') || lower.includes('scared') || lower.includes('worried')) {
    return {
      reply: `Take a slow, deep breath with me right now, ${userName}. Inhale for four seconds... and let it out slow. Overwhelm happens when our brain tries to solve twenty future problems all at once. It tricks us into feeling like everything is equally critical and urgent.\n\nLet's separate what genuinely needs your hands today from what is just noisy anxiety. If you could only move the needle on ONE single thing today, what would give you the most relief?`,
      suggestedActions: ['Write down 3 tasks and cross off the 2 that can wait until tomorrow.'],
      followUpSuggestions: [
        'Everything feels equally urgent right now',
        'My assignment is due tonight at midnight',
        'How can I calm my heart rate down quickly?',
      ],
      emotion: 'calm',
    };
  }

  // 4. Procrastination & Resistance
  if (lower.includes('procrastinat') || lower.includes('distract') || lower.includes('avoid') || lower.includes('start') || lower.includes('scroll') || lower.includes('focus')) {
    return {
      reply: `Oh, that classic friction of staring at an assignment and opening five other tabs instead. Most people think procrastination is laziness, but psychological research shows it's almost always emotional avoidance—the task feels vaguely intimidating, unstructured, or huge.\n\nThe trick is what I call the "ugly first draft" rule: promise yourself you only have to work for 4 minutes, and you are allowed to write the worst, most messy sentences possible. Once the momentum starts, the dread evaporates.\n\nWant to try a 10-minute micro-sprint together right now? What task are you putting off?`,
      suggestedActions: ['Open the document and write 1 messy sentence without editing.'],
      followUpSuggestions: [
        'Let\'s do a 10-minute sprint right now',
        'The hardest part is just opening the document',
        'How do I block distracting websites while studying?',
      ],
      emotion: 'thoughtful',
    };
  }

  // 5. Positive News & Wins
  if (lower.includes('good') || lower.includes('great') || lower.includes('happy') || lower.includes('aced') || lower.includes('passed') || lower.includes('proud') || lower.includes('finished')) {
    return {
      reply: `Yes! I love hearing that, ${userName}! Celebrate that win—students so rarely pause to give themselves credit before rushing to the next deadline. How does it feel to have that behind you?\n\nNotice how your focus and energy felt during that process. What do you think made the biggest difference in helping this go well?`,
      suggestedActions: ['Take a moment to savor your accomplishment before jumping into the next task.'],
      followUpSuggestions: [
        'Getting good sleep the night before made a huge difference',
        'Starting two days early kept my stress low',
        'Now I need to tackle the next project on my list',
      ],
      emotion: 'celebratory',
    };
  }

  // 6. Conversational follow-ups (if user said something short like "yes", "no", "maybe", "tell me more")
  if (lower === 'yes' || lower === 'yeah' || lower === 'sure' || lower.includes('let\'s do it') || lower.includes('tell me more')) {
    return {
      reply: `Awesome, let's keep that momentum going! Set a quick timer for 15 minutes, put your phone face down out of arm's reach, and dive into just the first piece of the task. Remember, zero expectation of perfection—just movement.\n\nI'll be right here waiting. Come tell me how the 15 minutes went once the timer rings. Ready to dive in?`,
      suggestedActions: ['Start a 15-minute focused sprint in the Action Planner.'],
      followUpSuggestions: [
        'Starting the timer now, see you in 15 mins!',
        'Can we pick a calming ambient sound first?',
        'What should I do if I get stuck midway?',
      ],
      emotion: 'encouraging',
    };
  }

  if (lower === 'no' || lower === 'not really' || lower.includes('can\'t') || lower.includes('don\'t want to')) {
    return {
      reply: `That is completely valid, ${userName}. Sometimes pushing harder is exactly the wrong medicine, and honoring your limit is the smartest move. When we're running on empty, forcing it just leads to burnout.\n\nIf active work is off the table right now, what is one gentle, restorative thing you could do for yourself instead? Even lying down for 10 minutes without screens can help reset your nervous system.`,
      suggestedActions: ['Rest for 10 minutes with eyes closed and no screens.'],
      followUpSuggestions: [
        'I think I will take a short nap',
        'I\'m going to make a warm cup of tea',
        'How do I stop feeling guilty when I rest?',
      ],
      emotion: 'calm',
    };
  }

  // General human-like conversational response with proactive follow-up
  const checkInContext = latestCheckIn
    ? `I notice in your latest check-in that your energy was around ${latestCheckIn.energy}/5 with a ${latestCheckIn.workload} workload. `
    : '';

  return {
    reply: `I'm right here with you, ${userName}. ${checkInContext}University life has a way of throwing so many overlapping demands at once, and it's easy to lose touch with how your mind and body are actually doing underneath it all.\n\nI want to make sure you feel supported today. What's on your mind right now—are you trying to figure out how to structure your day, or do you just need a safe space to vent and debrief?`,
    suggestedActions: ['Check in with today\'s reflection log.'],
    followUpSuggestions: [
      'I need help structuring my study blocks today',
      'I just need to vent about my workload',
      'Tell me what patterns you\'ve noticed in my data so far',
    ],
    emotion: turnCount > 2 ? 'empathetic' : 'thoughtful',
  };
}

function determineEmotionFromText(reply: string, userText: string): AIChatResponse['emotion'] {
  const combined = (reply + ' ' + userText).toLowerCase();
  if (combined.includes('celebrat') || combined.includes('congrat') || combined.includes('awesome') || combined.includes('great job') || combined.includes('yes!')) {
    return 'celebratory';
  }
  if (combined.includes('overwhelm') || combined.includes('exhaust') || combined.includes('hard') || combined.includes('struggl') || combined.includes('drained')) {
    return 'empathetic';
  }
  if (combined.includes('breathe') || combined.includes('calm') || combined.includes('gentle') || combined.includes('peace') || combined.includes('slow')) {
    return 'calm';
  }
  if (combined.includes('momentum') || combined.includes('can do this') || combined.includes('step') || combined.includes('let\'s tackle')) {
    return 'encouraging';
  }
  return 'thoughtful';
}

function getDefaultFollowUps(userText: string): string[] {
  const lower = userText.toLowerCase();
  if (lower.includes('exam') || lower.includes('study')) {
    return [
      'Help me set up a 25-minute study sprint',
      'What should I prioritize first?',
      'How do I avoid cramming panic?',
    ];
  }
  if (lower.includes('sleep') || lower.includes('tired')) {
    return [
      'How can I wind down faster tonight?',
      'Why do I feel groggy after 7 hours?',
      'I need to push through for a bit longer',
    ];
  }
  return [
    'How should I structure my study blocks today?',
    'What patterns stand out in my check-ins?',
    'Can we do a quick 2-minute breathing exercise?',
  ];
}
