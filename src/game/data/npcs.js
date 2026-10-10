// npcs.js
// Every NPC in the town. To add a new one, copy a block and change it.
//   x, y      position on the map (pixels)
//   texture   file name in public/assets/npcs/ (without .png)
//   voiceId   ElevenLabs voice ID (find yours at http://localhost:3001/api/voices)
//   dialogue  lines in order; a line with "choices" waits for the player's answer

export const NPCS = [
  {
    id: 'guide',
    name: 'Leo',
    x: 870,
    y: 715,
    texture: 'guide',
    // Leo (guide)
    voiceId: 'bIHbv24MWmeRgasZH58o', // Will: young, relaxed, friendly
    dialogue: [
      { say: "Hi there! You must be new in town. I'm Leo." },
      { say: 'This is the town square. Every shop is close by.' },
      {
        say: 'Where would you like to go first?',
        choices: [
          { text: 'Where is the bakery?', reply: "The bakery is up the road, on the left. You can't miss the red roof!" },
          { text: 'Where is the café?', reply: 'Go up the road and turn right. It has a blue roof.' },
          { text: 'Where is the library?', reply: 'Walk down this path to the right. Look for the purple roof.' },
        ],
      },
    ],
  },
  {
    id: 'baker',
    name: 'Baker Tom',
    x: 505,
    y: 370,
    texture: 'baker',
    // Baker Tom
    voiceId: 'iP95p4xoKVk53GoZ742B', // Chris: charming, down to earth
    dialogue: [
      { say: 'Good morning! Welcome to my bakery.' },
      { say: 'Everything is fresh from the oven today.' },
      {
        say: 'What would you like?',
        choices: [
          { text: "I'd like some bread, please.", reply: "Here you go! That's two dollars, please." },
          { text: 'Can I have a croissant?', reply: 'Of course! Croissants are my favorite too.' },
          { text: "I'm just looking, thank you.", reply: 'No problem. Take your time!' },
        ],
      },
    ],
  },
  {
    id: 'barista',
    name: 'Mia',
    x: 1060,
    y: 350,
    texture: 'barista',
    // Mia (barista)
    voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica: playful, bright, warm
    dialogue: [
      { say: 'Hello! Welcome to the café.' },
      {
        say: 'What can I get for you today?',
        choices: [
          { text: 'A hot chocolate, please.', reply: 'Great choice! Would you like whipped cream on top?' },
          { text: 'Can I have an iced tea?', reply: 'Sure! Small, medium or large?' },
          { text: "What do you recommend?", reply: 'Our caramel latte is very popular. You should try it!' },
        ],
      },
    ],
  },
  {
    id: 'grocer',
    name: 'Sam',
    x: 452,
    y: 752,
    texture: 'grocer',
    // Sam (grocer)
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie: energetic, Australian accent
    dialogue: [
      { say: 'Fresh fruit and vegetables! Straight from the farm.' },
      {
        say: 'What are you looking for?',
        choices: [
          { text: 'How much are the apples?', reply: 'They are fifty cents each, or three for one dollar.' },
          { text: "I'd like two carrots, please.", reply: 'Here are two carrots. Anything else?' },
          { text: 'Do you have any tomatoes?', reply: 'Yes! They are on the left, next to the cabbages.' },
        ],
      },
    ],
  },
  {
    id: 'librarian',
    name: 'Ms. Lily',
    x: 1230,
    y: 830,
    texture: 'librarian',
    // Ms. Lily (librarian)
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily: calm, British accent
    dialogue: [
      { say: 'Hello. Welcome to the library.' },
      { say: 'Please remember to speak quietly inside.' },
      {
        say: 'How can I help you?',
        choices: [
          { text: "I'm looking for a book about animals.", reply: 'Those are on the second shelf, near the window.' },
          { text: 'Can I borrow this book?', reply: 'Of course. Please bring it back in two weeks.' },
          { text: 'What time do you close?', reply: 'We close at six o’clock in the evening.' },
        ],
      },
    ],
  },
];
