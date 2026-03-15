type SignalDefinition = {
  id: string
  label: string
  keywords: string[]
}

export type ScreeningSignal = {
  id: string
  label: string
  score: number
  mentions: number
  matchedKeywords: string[]
}

export type ScreeningPreview = {
  signals: ScreeningSignal[]
  topSignal: ScreeningSignal | null
  messageCount: number
  tokenCount: number
  confidence: number
  hasCrisisLanguage: boolean
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: "internalizing",
    label: "Internalizing (depression and anxiety)",
    keywords: [
      "sad",
      "depressed",
      "hopeless",
      "anxious",
      "worry",
      "panic",
      "fatigue",
      "overwhelmed",
      "can't sleep",
      "insomnia",
    ],
  },
  {
    id: "obsessive_compulsive",
    label: "Obsessive-compulsive traits",
    keywords: [
      "obsess",
      "compulsion",
      "ritual",
      "checking",
      "intrusive thoughts",
      "contamination",
      "reassurance",
      "perfectionism",
      "repeating",
    ],
  },
  {
    id: "trauma_stress",
    label: "Trauma and stress response",
    keywords: [
      "flashback",
      "nightmare",
      "trauma",
      "unsafe",
      "hypervigilant",
      "startle",
      "avoidance",
      "triggered",
      "on edge",
    ],
  },
  {
    id: "thought_disorder",
    label: "Thought-disorder-like experiences",
    keywords: [
      "hearing voices",
      "hallucination",
      "paranoia",
      "delusion",
      "unreal",
      "derealization",
      "disorganized",
      "suspicious",
    ],
  },
  {
    id: "externalizing",
    label: "Externalizing and impulsivity",
    keywords: [
      "impulsive",
      "angry",
      "aggressive",
      "fight",
      "substance",
      "alcohol",
      "drug",
      "gambling",
      "risk",
    ],
  },
  {
    id: "somatic",
    label: "Somatic and health anxiety",
    keywords: [
      "pain",
      "stomach",
      "headache",
      "dizzy",
      "heart racing",
      "health anxiety",
      "nausea",
      "body",
    ],
  },
]

const CRISIS_TERMS = [
  "suicide",
  "suicidal",
  "kill myself",
  "want to die",
  "end my life",
  "self-harm",
  "hurt myself",
  "can't go on",
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function countMentions(text: string, phrase: string) {
  const regex = new RegExp(escapeRegExp(phrase), "gi")
  const matches = text.match(regex)
  return matches ? matches.length : 0
}

function scoreFromMentions(mentions: number, tokenCount: number) {
  if (mentions === 0) {
    return 0
  }

  const mentionStrength = 1 - Math.exp(-mentions / 2.5)
  const coverageFactor = clamp(tokenCount / 250, 0.3, 1)

  return Math.round(mentionStrength * 100 * coverageFactor)
}

export function buildScreeningPreview(patientMessages: string[]): ScreeningPreview {
  const cleanedMessages = patientMessages
    .map((message) => message.trim().toLowerCase())
    .filter(Boolean)

  const joinedText = cleanedMessages.join(" ")
  const tokenCount = joinedText.split(/\s+/).filter(Boolean).length
  const messageCount = cleanedMessages.length

  const signals = SIGNAL_DEFINITIONS.map((definition) => {
    let mentions = 0
    const matchedKeywords: string[] = []

    for (const keyword of definition.keywords) {
      const keywordMentions = countMentions(joinedText, keyword)
      if (keywordMentions > 0) {
        matchedKeywords.push(keyword)
        mentions += keywordMentions
      }
    }

    return {
      id: definition.id,
      label: definition.label,
      score: scoreFromMentions(mentions, tokenCount),
      mentions,
      matchedKeywords,
    }
  }).sort((a, b) => {
    if (b.score === a.score) {
      return b.mentions - a.mentions
    }

    return b.score - a.score
  })

  const topSignal = signals[0] ?? null
  const confidence = Math.round(clamp(messageCount / 12, 0.2, 1) * 100)
  const hasCrisisLanguage = CRISIS_TERMS.some(
    (term) => countMentions(joinedText, term) > 0,
  )

  return {
    signals,
    topSignal,
    messageCount,
    tokenCount,
    confidence,
    hasCrisisLanguage,
  }
}
