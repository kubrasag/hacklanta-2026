// npcs.js
// The villagers. Their spots on the map live in public/assets/town/town_map.json.
//   texture   sprite sheet in public/assets/characters/ (without .png)
//   voiceId   ElevenLabs voice (list yours at http://localhost:3001/api/voices)
//   persona   who they are; only Gemini reads this
//   role      shown in the Quest Book, in the help language

export const NPCS = {
  leo: {
    id: 'leo',
    name: 'Leo',
    texture: 'guide',
    voiceId: 'bIHbv24MWmeRgasZH58o', // Will: young, relaxed, friendly
    persona: 'Leo, the village guide. Cheerful and outdoorsy, loves showing newcomers around. Warm and simple.',
    role: { en: 'Village guide', tr: 'Köy rehberi', es: 'Guía del pueblo' },
  },
  tom: {
    id: 'tom',
    name: 'Tom',
    texture: 'baker',
    voiceId: 'iP95p4xoKVk53GoZ742B', // Chris: charming, down to earth
    persona: 'Tom, the baker. Jolly, proud of his croissants, likes small baking jokes.',
    role: { en: 'Baker', tr: 'Fırıncı', es: 'Panadero' },
  },
  mia: {
    id: 'mia',
    name: 'Mia',
    texture: 'barista',
    voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica: playful, bright, warm
    persona: 'Mia, who runs the café. Kind, a little dramatic, adores her small brown dog.',
    role: { en: 'Café owner', tr: 'Kafe sahibi', es: 'Dueña del café' },
  },
  sam: {
    id: 'sam',
    name: 'Sam',
    texture: 'grocer',
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie: energetic
    persona: 'Sam, the grocer at the market. Energetic, loves fresh fruit and vegetables.',
    role: { en: 'Grocer', tr: 'Manav', es: 'Frutero' },
  },
  lily: {
    id: 'lily',
    name: 'Lily',
    texture: 'librarian',
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily: calm
    persona: 'Lily, the librarian. Calm and gentle, loves recommending books.',
    role: { en: 'Librarian', tr: 'Kütüphaneci', es: 'Bibliotecaria' },
  },
};

export const NPC_ORDER = ['leo', 'tom', 'mia', 'sam', 'lily'];
