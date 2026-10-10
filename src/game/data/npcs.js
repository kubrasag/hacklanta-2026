// npcs.js
// Every NPC in the town. To add a new one, copy a block and change it.
//   x, y      position on the map (pixels)
//   texture   file name in public/assets/npcs/ (without .png)
//   voiceId   ElevenLabs voice ID (find yours at http://localhost:3001/api/voices)
//   goal      what the player should do in this conversation (shown on screen)
//   goalCheck what counts as success, in plain words (only Gemini reads this)
//   dialogue  the NPC's opening lines. The LAST line is the question the player answers.
//   hints     example answers, hidden until the player taps "Need an idea?"
//             reply = what the NPC says if the player picks this hint (also used without Gemini)

export const NPCS = [
  {
    id: 'guide',
    name: 'Leo',
    x: 870,
    y: 715,
    texture: 'guide',
    voiceId: 'bIHbv24MWmeRgasZH58o', // Will: young, relaxed, friendly
    goal: 'Ask Leo where a shop is',
    goalCheck: 'The child asks where a place in town is, or asks for directions.',
    dialogue: [
      { say: "Hi! I'm Leo. Welcome to our town!" },
      { say: 'There is a bakery, a café, a market and a library.' },
      { say: 'Where do you want to go?' },
    ],
    hints: [
      { text: 'Where is the bakery?', reply: 'Go up the road and turn left. Look for the red roof!' },
      { text: 'Where is the café?', reply: 'Go up the road and turn right. It has a blue roof.' },
      { text: 'Where is the library?', reply: 'Walk down the path on the right. It has a purple roof.' },
    ],
  },
  {
    id: 'baker',
    name: 'Baker Tom',
    x: 505,
    y: 370,
    texture: 'baker',
    voiceId: 'iP95p4xoKVk53GoZ742B', // Chris: charming, down to earth
    goal: 'Buy something from the bakery',
    goalCheck: 'The child asks for or orders any baked food, like bread, a croissant, a cake or cookies.',
    dialogue: [
      { say: 'Good morning! Welcome to my bakery.' },
      { say: 'Everything is fresh from the oven.' },
      { say: 'What would you like?' },
    ],
    hints: [
      { text: 'Can I have some bread, please?', reply: "Here you go! That's two dollars, please." },
      { text: "I'd like a croissant, please.", reply: 'Of course! Croissants are my favorite too.' },
      { text: 'How much is the cake?', reply: 'The cake is five dollars. It is chocolate!' },
    ],
  },
  {
    id: 'barista',
    name: 'Mia',
    x: 1060,
    y: 350,
    texture: 'barista',
    voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica: playful, bright, warm
    goal: 'Order a drink at the café',
    goalCheck: 'The child orders or asks for any drink, like hot chocolate, juice, milk, tea or water.',
    dialogue: [
      { say: 'Hello! Welcome to the café.' },
      { say: 'What would you like to drink?' },
    ],
    hints: [
      { text: 'A hot chocolate, please.', reply: 'Yummy! Do you want whipped cream on top?' },
      { text: 'Can I have orange juice?', reply: 'Sure! Small or big?' },
      { text: 'What do you recommend?', reply: 'Our strawberry milk is very popular. You should try it!' },
    ],
  },
  {
    id: 'grocer',
    name: 'Sam',
    x: 452,
    y: 752,
    texture: 'grocer',
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie: energetic, Australian accent
    goal: 'Buy some fruit or vegetables',
    goalCheck: 'The child asks for, or asks the price of, any fruit or vegetable.',
    dialogue: [
      { say: 'Fresh fruit and vegetables!' },
      { say: 'What are you looking for today?' },
    ],
    hints: [
      { text: 'How much are the apples?', reply: 'Fifty cents each, or three for one dollar.' },
      { text: "I'd like two carrots, please.", reply: 'Here are two carrots. Anything else?' },
      { text: 'Do you have bananas?', reply: 'Yes! They are next to the apples.' },
    ],
  },
  {
    id: 'librarian',
    name: 'Ms. Lily',
    x: 1230,
    y: 830,
    texture: 'librarian',
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily: calm, British accent
    goal: 'Ask Ms. Lily for a book',
    goalCheck: 'The child asks for a book, asks to borrow a book, or asks where to find books about something.',
    dialogue: [
      { say: 'Hello. Welcome to the library.' },
      { say: 'How can I help you?' },
    ],
    hints: [
      { text: 'Do you have books about animals?', reply: 'Yes! They are on the second shelf, by the window.' },
      { text: 'Can I borrow this book?', reply: 'Of course. Please bring it back in two weeks.' },
      { text: 'I want a funny book.', reply: 'Try this one. It is about a silly dragon!' },
    ],
  },
];
