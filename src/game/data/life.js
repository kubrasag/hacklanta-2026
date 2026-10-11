// life.js
// What each villager is up to RIGHT NOW, so they can talk about it at any time.
// The first moment whose "when" is true wins. "s" is the save state.
//   line     what they say when you walk up (learned language, translated for help)
//   why      their answer to "why?", "what's wrong?", "are you busy?" (optional, falls back to line)
//   now      the situation in plain English, for Gemini, so the villager never acts clueless
//   worried  true if "how are you?" should get their worry instead of "I'm fine"

const q = (s, id) => s.quests[id]?.status;

export const MOMENTS = {
  leo: [
    {
      when: (s) => s.time === 'evening',
      line: { en: 'What a beautiful night, {name}! I hung all these lanterns myself.', tr: 'Ne güzel bir gece, {name}! Bütün bu fenerleri ben astım.', es: '¡Qué noche tan bonita, {name}! Yo colgué todos estos faroles.' },
      now: 'It is the evening of the Lantern Festival at the fountain. Leo organized it and hung every lantern himself. He is proud and happy.',
    },
    {
      when: (s) => s.rumors.dogFound,
      line: { en: 'Everyone is talking about you and {dog}!', tr: 'Herkes senden ve {dog}’den bahsediyor!', es: '¡Todo el mundo habla de ti y de {dog}!' },
      now: "The whole village heard that the player found Mia's lost dog {dog}. Leo is impressed and getting the festival ready.",
    },
    {
      when: (s) => q(s, 'q2') === 'done',
      line: { en: "Did you hear? Mia's dog is lost. I hope someone finds him!", tr: 'Duydun mu? Mia’nın köpeği kayboldu. Umarım biri onu bulur!', es: '¿Sabes? El perro de Mia se perdió. ¡Ojalá alguien lo encuentre!' },
      why: { en: "Mia's dog is lost, so I'm checking the forest paths!", tr: 'Mia’nın köpeği kayboldu, ben de orman yollarına bakıyorum!', es: 'El perro de Mia se perdió, ¡así que reviso los caminos del bosque!' },
      now: "Mia's small brown dog {dog} ran away this morning. Leo checked the forest paths but did not find him. He is a bit worried.",
    },
    {
      when: () => true,
      line: { en: "Tom's bakery has a red roof. Go up the road!", tr: 'Tom’un fırınının kırmızı bir çatısı var. Yoldan yukarı çık!', es: 'La panadería de Tom tiene el techo rojo. ¡Sube por el camino!' },
      why: { en: "I'm getting the lanterns ready for tonight's festival!", tr: 'Bu akşamki şenlik için fenerleri hazırlıyorum!', es: '¡Preparo los faroles para el festival de esta noche!' },
      now: "Leo already welcomed the player this morning and told them to visit Tom's bakery for breakfast. He is preparing lanterns for tonight's festival.",
    },
  ],
  tom: [
    {
      when: (s) => s.time === 'evening',
      line: { en: 'I baked a special lantern cake for the festival!', tr: 'Şenlik için özel bir fener pastası yaptım!', es: '¡Hice una tarta especial de faroles para el festival!' },
      now: 'It is the evening of the Lantern Festival. Tom baked a special lantern-shaped cake and shares it with everyone.',
    },
    {
      when: (s) => s.rumors.dogMethod === 'croissant',
      line: { en: "A croissant for a dog? Ha! I'll bake him his own next time.", tr: 'Köpeğe kruvasan mı? Ha! Bir dahaki sefere ona özel bir tane yaparım.', es: '¿Un cruasán para un perro? ¡Ja! La próxima vez le hago uno para él.' },
      now: "Tom heard the player gave the croissant he sold them to Mia's hungry dog {dog}. He finds it funny and sweet.",
    },
    {
      when: (s) => s.rumors.dogFound,
      line: { en: 'I heard {dog} came when you called him. Amazing!', tr: 'Seslenince {dog} hemen gelmiş, duydum. Harika!', es: 'Me dijeron que {dog} vino cuando lo llamaste. ¡Increíble!' },
      now: "Tom heard that Mia's dog came running when the player called him in the local language. He is impressed.",
    },
    {
      when: (s) => q(s, 'q2') === 'done',
      line: { en: 'Welcome back, {name}! Another croissant?', tr: 'Tekrar hoş geldin, {name}! Bir kruvasan daha?', es: '¡Bienvenida otra vez, {name}! ¿Otro cruasán?' },
      why: { en: "Busy? I'm always busy! The bread doesn't bake itself.", tr: 'Meşgul mü? Hep meşgulüm! Ekmek kendi kendine pişmiyor.', es: '¿Ocupado? ¡Siempre! El pan no se hace solo.' },
      now: "This morning Tom sold the player a croissant and told them that Mia's dog ran away.",
    },
    {
      when: () => true,
      line: { en: 'Hello! Are you new here? Go and see Leo at the fountain!', tr: 'Merhaba! Yeni misin? Çeşmedeki Leo’ya git!', es: '¡Hola! ¿Eres nueva? ¡Ve a ver a Leo en la fuente!' },
      why: { en: "I'm baking bread for the whole village!", tr: 'Bütün köy için ekmek yapıyorum!', es: '¡Hago pan para todo el pueblo!' },
      now: "Tom is baking bread. He has not met the player properly yet and thinks newcomers should first meet Leo at the fountain.",
    },
  ],
  mia: [
    {
      when: (s) => s.dog === 'following',
      line: { en: 'You found {dog}! He is right beside you!', tr: '{dog} bulundu! Hemen yanında!', es: '¡Encontraste a {dog}! ¡Está a tu lado!' },
      now: 'The player has found {dog}, who is following them. Mia sees him and is relieved. Finish the existing return quest to bring him home.',
    },
    {
      when: (s) => s.rumors.dogFound && s.time === 'evening',
      line: { en: '{dog} and I love the lanterns. Thank you for everything, {name}!', tr: '{dog} ve ben fenerlere bayılıyoruz. Her şey için teşekkürler, {name}!', es: '{dog} y yo adoramos los faroles. ¡Gracias por todo, {name}!' },
      now: 'It is the Lantern Festival. {dog} is home safe and sits next to Mia. She is very grateful to the player for finding him.',
    },
    {
      when: (s) => s.rumors.dogFound,
      line: { en: '{dog} is so happy today. Thank you, {name}!', tr: '{dog} bugün çok mutlu. Teşekkürler, {name}!', es: '{dog} está muy feliz hoy. ¡Gracias, {name}!' },
      now: '{dog} is home safe because the player found him. Mia is relieved and grateful.',
    },
    {
      when: (s) => q(s, 'q3') === 'active' && s.quests.q3.step > 0,
      worried: true,
      line: { en: 'Any news about {dog}? He loves the flowers by the library...', tr: '{dog}’den haber var mı? Kütüphanenin yanındaki çiçekleri çok sever...', es: '¿Sabes algo de {dog}? Le encantan las flores junto a la biblioteca...' },
      why: { en: "I can't stop thinking about {dog}. Please find him!", tr: '{dog}’yi düşünmeden duramıyorum. Lütfen onu bul!', es: 'No dejo de pensar en {dog}. ¡Por favor, encuéntralo!' },
      now: "Mia's small brown dog {dog} ran away this morning. The player offered to help and is looking for him in the garden by the library. Mia is anxious and cannot concentrate on the café.",
    },
    {
      when: () => true,
      worried: true,
      line: { en: 'Hi... I am worried about {dog}, but I would love some company.', tr: 'Merhaba... {dog} için endişeliyim, ama sohbet iyi gelir.', es: 'Hola... Estoy preocupada por {dog}, pero me vendría bien hablar.' },
      why: { en: "My little dog {dog} ran away this morning! I'm looking everywhere.", tr: 'Küçük köpeğim {dog} bu sabah kaçtı! Her yere bakıyorum.', es: '¡Mi perrito {dog} se escapó esta mañana! Lo busco por todas partes.' },
      now: "Mia's small brown dog {dog} ran away early this morning. She is upset and keeps running out of the café to look for him. She has not asked the player for help yet, but if they ask why she is busy or what is wrong, she tells them her dog is missing.",
    },
  ],
  sam: [
    {
      when: (s) => s.time === 'evening',
      line: { en: 'Look! My giant pumpkin came to the festival too!', tr: 'Bak! Dev balkabağım da şenliğe geldi!', es: '¡Mira! ¡Mi calabaza gigante también vino al festival!' },
      now: 'It is the Lantern Festival. Sam brought his giant pumpkin and shows it to everyone.',
    },
    {
      when: (s) => s.rumors.dogFound,
      line: { en: 'Thanks for finding {dog}! The whole village is happy.', tr: '{dog}’yi bulduğun için teşekkürler! Bütün köy mutlu.', es: '¡Gracias por encontrar a {dog}! Todo el pueblo está feliz.' },
      now: "Sam heard the player found Mia's lost dog. He is happy for Mia.",
    },
    {
      when: (s) => q(s, 'r1') === 'done',
      line: { en: 'Back again, {name}? The apples are still fresh!', tr: 'Yine mi geldin, {name}? Elmalar hâlâ taze!', es: '¿Otra vez por aquí, {name}? ¡Las manzanas siguen frescas!' },
      now: 'The player bought three apples from Sam earlier today.',
    },
    {
      when: (s) => q(s, 'q3') === 'active',
      line: { en: 'A little brown dog ran past my stall this morning!', tr: 'Bu sabah küçük kahverengi bir köpek tezgâhımın önünden koştu!', es: '¡Un perrito marrón pasó corriendo por mi puesto esta mañana!' },
      why: { en: 'Busy morning! And a little dog ran toward the library.', tr: 'Yoğun bir sabah! Bir de küçük bir köpek kütüphaneye doğru koştu.', es: '¡Mañana movida! Y un perrito corrió hacia la biblioteca.' },
      now: 'This morning Sam saw a small brown dog run past the market toward the library.',
    },
    {
      when: () => true,
      line: { en: 'Hello there! Have you met Leo yet?', tr: 'Merhaba! Leo ile tanıştın mı?', es: '¡Hola! ¿Ya conoces a Leo?' },
      why: { en: 'The market is always busy in the morning!', tr: 'Pazar sabahları hep kalabalık olur!', es: '¡El mercado siempre está lleno por la mañana!' },
      now: 'Sam is selling fruit and vegetables at the market. He is secretly growing a giant pumpkin for the festival.',
    },
  ],
  lily: [
    {
      when: (s) => s.time === 'evening',
      line: { en: 'The lanterns are like a poem tonight.', tr: 'Fenerler bu gece bir şiir gibi.', es: 'Los faroles parecen un poema esta noche.' },
      now: 'It is the Lantern Festival. Lily is calm and happy and is thinking of a poem about the lanterns.',
    },
    {
      when: (s) => s.rumors.dogFound,
      line: { en: 'So the little dog in my garden was {dog}! Mystery solved.', tr: 'Demek bahçemdeki küçük köpek {dog} imiş! Gizem çözüldü.', es: '¡Así que el perrito de mi jardín era {dog}! Misterio resuelto.' },
      now: 'Lily had seen a small dog in the garden by the library. The player found him and brought him home; Lily loves that the mystery is solved.',
    },
    {
      when: (s) => q(s, 'r2') === 'done',
      line: { en: 'How is the dog book, {name}?', tr: 'Köpek kitabı nasıl, {name}?', es: '¿Qué tal el libro de perros, {name}?' },
      now: 'The player borrowed a book about a brave puppy from Lily today.',
    },
    {
      when: (s) => q(s, 'q3') === 'active',
      line: { en: 'I saw a little brown dog in the flowers outside...', tr: 'Dışarıdaki çiçeklerin arasında küçük kahverengi bir köpek gördüm...', es: 'Vi un perrito marrón entre las flores de afuera...' },
      why: { en: 'I was watching a little dog in the garden outside!', tr: 'Dışarıdaki bahçede küçük bir köpeği izliyordum!', es: '¡Estaba mirando a un perrito en el jardín de afuera!' },
      now: 'This afternoon Lily noticed a small brown dog hiding in the flower garden next to the library.',
    },
    {
      when: () => true,
      line: { en: 'Hello! I have a new mystery book to tell you about.', tr: 'Merhaba! Sana anlatacağım yeni bir polisiye kitabım var.', es: '¡Hola! Tengo un nuevo libro de misterio para recomendarte.' },
      why: { en: "I'm sorting new books. Very exciting!", tr: 'Yeni kitapları düzenliyorum. Çok heyecanlı!', es: 'Ordeno libros nuevos. ¡Muy emocionante!' },
      now: 'Lily has been sorting new library books today. Her cat Miso sleeps in the library window. Her physical location is specified separately.',
    },
  ],
};

// Ideas for beginners in free chat (tap one, then say it)
export const CHAT_IDEAS = [
  { icon: '🙂', text: { en: 'How are you?', tr: 'Nasılsın?', es: '¿Qué tal?' } },
  { icon: '❓', text: { en: "What's up?", tr: 'Ne oldu?', es: '¿Qué pasa?' } },
  { icon: '💛', text: { en: 'What do you like?', tr: 'Neleri seversin?', es: '¿Qué te gusta?' } },
  { icon: '🗣️', text: { en: 'Tell me about you.', tr: 'Biraz kendini anlat.', es: 'Háblame de ti.' } },
];

// Offline chat: what the player is asking about (simplified, "*" = word start)
export const INTENTS = {
  why: { en: ['why', 'busy', "what's wrong", 'whats wrong', 'what happened', "what's up", 'whats up', 'problem', 'sad', 'worried'], tr: ['neden', 'niye', 'mesgul*', 'ne oldu', 'sorun', 'uzgun*', 'ne var'], es: ['por que', 'porque', 'ocupad*', 'que pasa', 'que te pasa', 'problema', 'triste', 'preocupad*'] },
  howareyou: { en: ['how are you', "how's it going", 'hows it going', 'are you ok', 'how are things'], tr: ['nasilsin*', 'naber', 'ne haber', 'iyi misin', 'nasil gidiyor'], es: ['que tal', 'como estas', 'estas bien', 'como te va'] },
  name: { en: ['your name'], tr: ['adin ne', 'ismin ne'], es: ['como te llamas', 'tu nombre'] },
  about: { en: ['who are you', 'what do you do', 'your job', 'work*', 'about you', 'tell me about'], tr: ['kimsin', 'ne is', 'isin ne', 'ne yapiyorsun', 'meslegin', 'kendini anlat'], es: ['quien eres', 'a que te dedicas', 'trabaj*', 'que haces', 'hablame de ti'] },
  likes: { en: ['like', 'love', 'favorite', 'favourite', 'hobby', 'hobbies'], tr: ['sever*', 'seviyor*', 'favori', 'hobi*', 'hoslan*'], es: ['gusta*', 'favorit*', 'encanta*', 'hobby', 'pasatiempo*'] },
  bye: { en: ['bye', 'goodbye', 'see you'], tr: ['gorusuruz', 'hosca kal', 'bay bay', 'gule gule'], es: ['adios', 'hasta luego', 'chao', 'nos vemos'] },
};

export const CHAT_LINES = {
  greet: { en: 'Hi, {name}! Nice to see you.', tr: 'Merhaba {name}! Seni görmek güzel.', es: '¡Hola, {name}! Qué gusto verte.' },
  fine: { en: "I'm good, thanks! And you?", tr: 'İyiyim, teşekkürler! Sen nasılsın?', es: '¡Muy bien, gracias! ¿Y tú?' },
  thanks: { en: "You're welcome!", tr: 'Rica ederim!', es: '¡De nada!' },
  bye: { en: 'See you later, {name}!', tr: 'Görüşürüz, {name}!', es: '¡Hasta luego, {name}!' },
  name: { en: 'My name is {npc}.', tr: 'Benim adım {npc}.', es: 'Me llamo {npc}.' },
  dogLost: { en: "Mia's dog {dog} is still lost. Poor Mia!", tr: 'Mia’nın köpeği {dog} hâlâ kayıp. Zavallı Mia!', es: 'El perro de Mia, {dog}, sigue perdido. ¡Pobre Mia!' },
  dogSafe: { en: '{dog} is safe at home now. Thanks to you!', tr: '{dog} artık evinde, güvende. Senin sayende!', es: '{dog} ya está a salvo en casa. ¡Gracias a ti!' },
  fallback: [
    { en: 'Ha ha, nice! Do you like the village?', tr: 'Ha ha, güzel! Köyü sevdin mi?', es: '¡Ja, ja, qué bien! ¿Te gusta el pueblo?' },
    { en: 'Really? Tell me more!', tr: 'Gerçekten mi? Biraz daha anlat!', es: '¿De verdad? ¡Cuéntame más!' },
    { en: 'Hmm, I see. What do you like to do?', tr: 'Hımm, anlıyorum. Ne yapmayı seversin?', es: 'Mmm, ya veo. ¿Qué te gusta hacer?' },
  ],
};
