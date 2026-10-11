// story.js
// Day 1 in the village. Every text exists in English (en), Turkish (tr) and Spanish (es).
// The player READS and HEARS the language they learn, and gets help in the language they speak.
//
// Placeholders: {name} = the player's name, {dog} = the dog's name, {village} = the village name.
//
// A quest is a list of steps. Step types:
//   talk   talk to a villager and reach a speaking goal
//   find   find Biscuit and decide how to bring him back
//
// task.pass.any = the goal is reached when ANY of these words is used (offline check).
// Gemini uses task.check instead, so a natural answer also counts.

export const QUESTS = {
  q1: {
    id: 'q1',
    kind: 'main',
    icon: '👋',
    title: { en: 'A New Neighbor', tr: 'Yeni Komşu', es: 'Una nueva vecina' },
    desc: {
      en: 'You just moved to {village}. Leo is waiting for you at the fountain.',
      tr: 'Yeni bir köye taşındın: {village}. Leo seni çeşmenin yanında bekliyor.',
      es: 'Acabas de mudarte a {village}. Leo te espera en la fuente.',
    },
    steps: [
      {
        id: 'q1_leo',
        type: 'talk',
        npc: 'leo',
        objective: { en: 'Talk to Leo by the fountain', tr: 'Çeşmenin yanındaki Leo ile konuş', es: 'Habla con Leo junto a la fuente' },
        intro: [
          { en: 'Hello! Welcome to {village}!', tr: 'Merhaba! {village} köyüne hoş geldin!', es: '¡Hola! ¡Bienvenida a {village}!' },
          { en: "I'm Leo. I live here. What's your name?", tr: 'Ben Leo. Burada yaşıyorum. Senin adın ne?', es: 'Soy Leo. Vivo aquí. ¿Cómo te llamas?' },
        ],
        discover: 'hello',
        task: {
          goal: { en: 'Say hello and tell Leo your name.', tr: 'Merhaba de ve Leo’ya adını söyle.', es: 'Saluda y dile a Leo tu nombre.' },
          check: 'The player tells Leo their name (a greeting alone is not enough). Any way of introducing yourself counts.',
          model: { en: 'Hello! My name is …', tr: 'Merhaba! Benim adım …', es: '¡Hola! Me llamo …' },
          words: ['hello', 'myname'],
          pass: { any: ['myname'] },
        },
        success: [
          { en: 'Nice to meet you, {name}!', tr: 'Memnun oldum, {name}!', es: '¡Mucho gusto, {name}!' },
          {
            en: 'Tom at the bakery makes the best croissants. Go and say hi!',
            tr: 'Fırındaki Tom en güzel kruvasanları yapar. Gidip ona merhaba de!',
            es: 'Tom, el panadero, hace los mejores cruasanes. ¡Ve a saludarlo!',
          },
        ],
        reward: {
          memory: { en: 'Your name is {name}. You just moved here.', tr: 'Adın {name}. Köye yeni taşındın.', es: 'Te llamas {name}. Acabas de mudarte aquí.' },
          unlock: ['q2', 'r1', 'r2'],
        },
      },
    ],
  },

  q2: {
    id: 'q2',
    kind: 'main',
    icon: '🥐',
    title: { en: 'Fresh From the Oven', tr: 'Fırından Yeni Çıktı', es: 'Recién horneado' },
    desc: {
      en: 'Leo says Tom bakes the best croissants in town. Time for breakfast!',
      tr: 'Leo’ya göre köyün en güzel kruvasanlarını Tom yapıyor. Kahvaltı zamanı!',
      es: 'Leo dice que Tom hace los mejores cruasanes del pueblo. ¡Hora de desayunar!',
    },
    steps: [
      {
        id: 'q2_tom',
        type: 'talk',
        npc: 'tom',
        objective: { en: 'Visit Tom at the bakery', tr: 'Fırındaki Tom’u ziyaret et', es: 'Visita a Tom en la panadería' },
        intro: [
          { en: 'Good morning, {name}! Leo told me about you.', tr: 'Günaydın, {name}! Leo bana senden bahsetti.', es: '¡Buenos días, {name}! Leo me habló de ti.' },
          { en: 'Everything is fresh from the oven. What would you like?', tr: 'Her şey fırından yeni çıktı. Ne istersin?', es: 'Todo está recién horneado. ¿Qué te gustaría?' },
        ],
        discover: 'goodmorning',
        task: {
          goal: { en: 'Order a croissant politely.', tr: 'Kibarca bir kruvasan sipariş et.', es: 'Pide un cruasán con amabilidad.' },
          check: 'The player orders or asks for a croissant (another pastry is also fine). Saying please is a bonus, not required.',
          model: { en: "I'd like a croissant, please.", tr: 'Bir kruvasan istiyorum, lütfen.', es: 'Quisiera un cruasán, por favor.' },
          words: ['idlike', 'croissant', 'please'],
          pass: { any: ['croissant'] },
          bonus: 'please',
        },
        success: [
          { en: 'Here you go! One warm croissant.', tr: 'Buyur! Sıcacık bir kruvasan.', es: '¡Aquí tienes! Un cruasán calentito.' },
          { en: "Oh, by the way... Mia's dog ran away this morning.", tr: 'Bu arada... Mia’nın köpeği bu sabah kaçtı.', es: 'Por cierto... el perro de Mia se escapó esta mañana.' },
          { en: "She's at the café. She looks very sad.", tr: 'Mia kafede. Çok üzgün görünüyor.', es: 'Está en el café. Está muy triste.' },
        ],
        reward: {
          item: 'croissant',
          memory: { en: 'You ordered a croissant.', tr: 'Bir kruvasan sipariş ettin.', es: 'Pediste un cruasán.' },
          unlock: ['q3'],
          time: 'afternoon',
        },
      },
    ],
  },

  q3: {
    id: 'q3',
    kind: 'main',
    icon: '🐶',
    title: { en: 'Where Is {dog}?', tr: '{dog} Nerede?', es: '¿Dónde está {dog}?' },
    desc: {
      en: "Mia's little dog is lost. Maybe you can help.",
      tr: 'Mia’nın küçük köpeği kayboldu. Belki yardım edebilirsin.',
      es: 'El perrito de Mia se perdió. Quizás puedas ayudar.',
    },
    steps: [
      {
        id: 'q3_mia',
        type: 'talk',
        npc: 'mia',
        objective: { en: 'Talk to Mia at the café', tr: 'Kafedeki Mia ile konuş', es: 'Habla con Mia en el café' },
        intro: [
          { en: 'Oh, hi {name}... My dog {dog} is lost!', tr: 'Ah, merhaba {name}... Köpeğim {dog} kayboldu!', es: 'Ay, hola {name}... ¡Mi perro {dog} se perdió!' },
          { en: "I looked everywhere. I don't know what to do.", tr: 'Her yere baktım. Ne yapacağımı bilmiyorum.', es: 'Lo busqué por todas partes. No sé qué hacer.' },
        ],
        discover: 'dog',
        task: {
          goal: { en: 'Offer to help Mia.', tr: 'Mia’ya yardım etmeyi teklif et.', es: 'Ofrécele ayuda a Mia.' },
          check: 'The player offers to help Mia or offers to look for the dog.',
          model: { en: "Don't worry, I can help!", tr: 'Merak etme, yardım edebilirim!', es: '¡No te preocupes, puedo ayudar!' },
          words: ['help', 'dog'],
          pass: { any: ['help'] },
        },
        success: [
          { en: 'Really? Thank you, {name}!', tr: 'Gerçekten mi? Teşekkürler, {name}!', es: '¿De verdad? ¡Gracias, {name}!' },
          { en: '{dog} is small and brown.', tr: '{dog} küçük ve kahverengi.', es: '{dog} es pequeño y marrón.' },
          {
            en: 'He loves the flowers in the garden by the library.',
            tr: 'Kütüphanenin yanındaki bahçede çiçekleri çok sever.',
            es: 'Le encantan las flores del jardín junto a la biblioteca.',
          },
        ],
        question: {
          ask: { en: 'Where should you look for {dog}?', tr: '{dog} nerede olabilir?', es: '¿Dónde deberías buscar a {dog}?' },
          options: [
            { icon: '📚', text: { en: 'By the library', tr: 'Kütüphanenin yanında', es: 'Junto a la biblioteca' }, correct: true },
            { icon: '🍞', text: { en: 'At the bakery', tr: 'Fırında', es: 'En la panadería' } },
            { icon: '⛲', text: { en: 'At the fountain', tr: 'Çeşmede', es: 'En la fuente' } },
          ],
        },
        reward: {
          memory: { en: 'You offered to help find {dog}.', tr: 'Köpeği ({dog}) bulmak için yardım teklif ettin.', es: 'Te ofreciste a buscar a {dog}.' },
        },
      },
      {
        id: 'q3_find',
        type: 'find',
        npc: 'biscuit',
        objective: { en: 'Look for {dog} by the library', tr: 'Kütüphanenin yanında köpeği ara ({dog})', es: 'Busca a {dog} junto a la biblioteca' },
        narration: {
          en: '{dog} is hiding in the flowers. He looks scared and hungry.',
          tr: '{dog} çiçeklerin arasına saklanmış. Korkmuş ve aç görünüyor.',
          es: '{dog} está escondido entre las flores. Parece asustado y con hambre.',
        },
        bark: { en: 'Woof... woof?', tr: 'Hav... hav?', es: 'Guau... ¿guau?' },
        choices: [
          {
            id: 'croissant',
            icon: '🥐',
            item: 'croissant',
            text: { en: 'Give him your croissant', tr: 'Ona kruvasanını ver', es: 'Dale tu cruasán' },
            result: {
              en: '{dog} gobbles up the croissant and wags his tail!',
              tr: '{dog} kruvasanı bir lokmada yiyip kuyruğunu sallıyor!',
              es: '¡{dog} se come el cruasán y mueve la cola!',
            },
          },
          {
            id: 'call',
            icon: '🗣️',
            text: { en: 'Call him gently (speak)', tr: 'Onu nazikçe çağır (konuş)', es: 'Llámalo con cariño (habla)' },
            task: {
              goal: { en: 'Call {dog} so he comes to you.', tr: 'Köpeği çağır, sana gelsin ({dog}).', es: 'Llama a {dog} para que venga.' },
              check: 'The player calls the dog to come.',
              model: { en: 'Come here, {dog}!', tr: 'Gel, {dog}!', es: '¡Ven, {dog}!' },
              words: ['comehere'],
              pass: { any: ['comehere'], orDogName: true },
            },
            result: {
              en: '{dog} perks up his ears and runs to you!',
              tr: '{dog} kulaklarını dikip sana koşuyor!',
              es: '¡{dog} levanta las orejas y corre hacia ti!',
            },
          },
        ],
        reward: { follow: true },
      },
      {
        id: 'q3_return',
        type: 'talk',
        npc: 'mia',
        objective: { en: 'Bring {dog} back to Mia', tr: 'Köpeği Mia’ya geri götür ({dog})', es: 'Lleva a {dog} con Mia' },
        intro: [
          { en: '{dog}! You found him!', tr: '{dog}! Onu buldun!', es: '¡{dog}! ¡Lo encontraste!' },
        ],
        task: {
          goal: { en: 'Give {dog} back to Mia.', tr: 'Köpeği Mia’ya teslim et.', es: 'Devuélvele a {dog} a Mia.' },
          check: 'The player hands the dog back, for example "here is your dog".',
          model: { en: 'Here is your dog!', tr: 'İşte köpeğin!', es: '¡Aquí está tu perro!' },
          words: ['hereis', 'dog'],
          pass: { any: ['hereis', 'dog'], orDogName: true },
        },
        success: [
          { en: 'Thank you so much, {name}! You are a hero!', tr: 'Çok teşekkür ederim, {name}! Sen bir kahramansın!', es: '¡Muchas gracias, {name}! ¡Eres una heroína!' },
          {
            en: 'Tonight there is a Lantern Festival at the fountain. Come!',
            tr: 'Bu akşam çeşmede Fener Şenliği var. Sen de gel!',
            es: 'Esta noche hay un Festival de Faroles en la fuente. ¡Ven!',
          },
        ],
        reward: {
          memory: { en: 'You found {dog} and brought him home.', tr: 'Köpeği ({dog}) bulup eve getirdin.', es: 'Encontraste a {dog} y lo trajiste a casa.' },
          dogHome: true,
          unlock: ['q4'],
          time: 'evening',
        },
      },
    ],
  },

  q4: {
    id: 'q4',
    kind: 'main',
    icon: '🏮',
    title: { en: 'The Lantern Festival', tr: 'Fener Şenliği', es: 'El Festival de Faroles' },
    desc: {
      en: 'Everyone heard what you did. The village is celebrating tonight!',
      tr: 'Herkes yaptığını duydu. Köy bu akşam kutlama yapıyor!',
      es: 'Todos saben lo que hiciste. ¡El pueblo celebra esta noche!',
    },
    steps: [
      {
        id: 'q4_invite',
        type: 'talk',
        npc: 'inviter',
        objective: { en: 'Join the festival at the fountain', tr: 'Çeşmedeki şenliğe katıl', es: 'Ve al festival en la fuente' },
        introBy: {
          leo: [{ en: '{name}! Will you watch the lanterns with me?', tr: '{name}! Fenerleri benimle izler misin?', es: '¡{name}! ¿Quieres ver los faroles conmigo?' }],
          tom: [{ en: '{name}! I baked something special. Will you sit with me?', tr: '{name}! Özel bir şey pişirdim. Benimle oturur musun?', es: '¡{name}! Hice algo especial. ¿Te sientas conmigo?' }],
          mia: [{ en: '{name}! {dog} and I saved you a seat. Will you join us?', tr: '{name}! {dog} ile sana yer ayırdık. Bize katılır mısın?', es: '¡{name}! {dog} y yo te guardamos un sitio. ¿Vienes con nosotros?' }],
          sam: [{ en: '{name}! I brought fresh fruit for everyone. Will you join me?', tr: '{name}! Herkese taze meyve getirdim. Bana katılır mısın?', es: '¡{name}! Traje fruta fresca para todos. ¿Vienes conmigo?' }],
          lily: [{ en: '{name}! I will read a story under the lanterns. Will you listen?', tr: '{name}! Fenerlerin altında bir hikâye okuyacağım. Dinler misin?', es: '¡{name}! Voy a leer un cuento bajo los faroles. ¿Me escuchas?' }],
        },
        task: {
          goal: { en: 'Accept the invitation and say thank you.', tr: 'Daveti kabul et ve teşekkür et.', es: 'Acepta la invitación y da las gracias.' },
          check: 'The player accepts the invitation (yes, sure, of course) or says thank you.',
          model: { en: 'Yes, thank you!', tr: 'Evet, teşekkürler!', es: '¡Sí, gracias!' },
          words: ['yes', 'thanks'],
          pass: { any: ['yes', 'thanks'] },
        },
        success: [
          { en: 'Wonderful! Welcome to the family, {name}.', tr: 'Harika! Aramıza hoş geldin, {name}.', es: '¡Qué bien! Bienvenida a la familia, {name}.' },
        ],
        endingBy: {
          croissant: {
            en: 'Tom says your next croissant is free. {dog} wants one too!',
            tr: 'Tom bir sonraki kruvasanın bedava olduğunu söylüyor. {dog} da bir tane istiyor!',
            es: 'Tom dice que tu próximo cruasán es gratis. ¡{dog} también quiere uno!',
          },
          call: {
            en: 'And {dog} follows you everywhere now. He loves your voice!',
            tr: '{dog} artık her yerde peşinden geliyor. Sesini çok seviyor!',
            es: 'Y ahora {dog} te sigue a todas partes. ¡Le encanta tu voz!',
          },
        },
        reward: { dayDone: true },
      },
    ],
  },

  r1: {
    id: 'r1',
    kind: 'side',
    icon: '🍎',
    title: { en: 'Market Run', tr: 'Pazar Alışverişi', es: 'De compras al mercado' },
    desc: {
      en: "Sam's apples are the crunchiest in the valley.",
      tr: 'Sam’in elmaları vadinin en çıtır elmaları.',
      es: 'Las manzanas de Sam son las más crujientes del valle.',
    },
    steps: [
      {
        id: 'r1_sam',
        type: 'talk',
        npc: 'sam',
        objective: { en: 'Buy apples from Sam at the market', tr: 'Pazardaki Sam’den elma al', es: 'Compra manzanas a Sam en el mercado' },
        intro: [
          { en: 'Fresh fruit! Fresh vegetables! What do you need?', tr: 'Taze meyve! Taze sebze! Ne lazım?', es: '¡Fruta fresca! ¡Verdura fresca! ¿Qué necesitas?' },
        ],
        task: {
          goal: { en: 'Buy three apples.', tr: 'Üç elma al.', es: 'Compra tres manzanas.' },
          check: 'The player asks for apples. Asking for three apples is ideal.',
          model: { en: 'Three apples, please.', tr: 'Üç elma, lütfen.', es: 'Tres manzanas, por favor.' },
          words: ['three', 'apples', 'please'],
          pass: { any: ['apples'] },
          bonus: 'please',
        },
        success: [
          { en: 'Three red apples for you. Enjoy!', tr: 'Sana üç kırmızı elma. Afiyet olsun!', es: 'Tres manzanas rojas para ti. ¡Que aproveche!' },
        ],
        reward: {
          item: 'apples',
          memory: { en: 'You bought three apples.', tr: 'Üç elma aldın.', es: 'Compraste tres manzanas.' },
        },
      },
    ],
  },

  r2: {
    id: 'r2',
    kind: 'side',
    icon: '📕',
    title: { en: 'Bookworm', tr: 'Kitap Kurdu', es: 'Ratón de biblioteca' },
    desc: {
      en: 'Lily knows every book in the library. Ask her for one!',
      tr: 'Lily kütüphanedeki her kitabı bilir. Ondan bir kitap iste!',
      es: 'Lily conoce todos los libros de la biblioteca. ¡Pídele uno!',
    },
    steps: [
      {
        id: 'r2_lily',
        type: 'talk',
        npc: 'lily',
        objective: { en: 'Ask Lily for a book', tr: 'Lily’den bir kitap iste', es: 'Pídele un libro a Lily' },
        intro: [
          { en: 'Hello! Would you like a book recommendation?', tr: 'Merhaba! Bir kitap önerisi ister misin?', es: '¡Hola! ¿Quieres que te recomiende un libro?' },
        ],
        task: {
          goal: { en: 'Ask for a book about dogs.', tr: 'Köpekler hakkında bir kitap iste.', es: 'Pide un libro sobre perros.' },
          check: 'The player asks for a book (ideally about dogs).',
          model: { en: 'Do you have a book about dogs?', tr: 'Köpekler hakkında bir kitabınız var mı?', es: '¿Tienes un libro sobre perros?' },
          words: ['book', 'dog'],
          pass: { any: ['book'] },
        },
        success: [
          { en: 'Of course! This one is about a very brave puppy.', tr: 'Tabii! Bu kitap çok cesur bir köpek yavrusu hakkında.', es: '¡Claro! Este es sobre un perrito muy valiente.' },
        ],
        reward: {
          item: 'book',
          memory: { en: 'You borrowed a book about dogs.', tr: 'Köpekler hakkında bir kitap ödünç aldın.', es: 'Te llevaste un libro sobre perros.' },
        },
      },
    ],
  },
};

export const MAIN_ORDER = ['q1', 'q2', 'q3', 'q4'];
export const SIDE_ORDER = ['r1', 'r2'];

export const ITEMS = {
  croissant: { icon: '🥐', text: { en: 'Croissant', tr: 'Kruvasan', es: 'Cruasán' } },
  apples: { icon: '🍎', text: { en: '3 apples', tr: '3 elma', es: '3 manzanas' } },
  book: { icon: '📕', text: { en: 'Dog book', tr: 'Köpek kitabı', es: 'Libro de perros' } },
};

// What villagers say outside quests lives in life.js (MOMENTS).

// Speech bubbles in the evening: the village heard what you did.
export const BARKS = [
  { npc: 'sam', when: (s) => s.rumors.dogFound, line: { en: 'Thanks for finding {dog}!', tr: '{dog} için teşekkürler!', es: '¡Gracias por encontrar a {dog}!' } },
  { npc: 'lily', when: (s) => s.rumors.dogFound, line: { en: 'Everyone is talking about you!', tr: 'Herkes senden bahsediyor!', es: '¡Todo el mundo habla de ti!' } },
  { npc: 'tom', when: (s) => s.rumors.dogMethod === 'croissant', line: { en: 'A croissant for a dog? Ha! I love it!', tr: 'Köpeğe kruvasan mı? Ha! Bayıldım!', es: '¿Un cruasán para un perro? ¡Ja! ¡Me encanta!' } },
  { npc: 'tom', when: (s) => s.rumors.dogMethod === 'call', line: { en: 'The dog came when you called? Amazing!', tr: 'Köpek seslenince geldi mi? Harika!', es: '¿El perro vino cuando lo llamaste? ¡Increíble!' } },
  { npc: 'leo', when: (s) => s.rumors.dogFound, line: { en: 'The festival starts soon, {name}!', tr: 'Şenlik birazdan başlıyor, {name}!', es: '¡El festival empieza pronto, {name}!' } },
  { npc: 'mia', when: (s) => s.rumors.dogFound, line: { en: '{dog} loves you, {name}!', tr: '{dog} seni çok seviyor, {name}!', es: '¡{dog} te quiere mucho, {name}!' } },
];

// When the goal is not reached yet and Gemini is not available
export const RETRY_LINES = [
  { en: 'Sorry, can you say that again?', tr: 'Pardon, tekrar söyler misin?', es: 'Perdona, ¿puedes repetirlo?' },
  { en: 'Hmm, I did not understand. One more time?', tr: 'Hımm, anlamadım. Bir kez daha?', es: 'Mmm, no entendí. ¿Otra vez?' },
];

export const DOG_HAPPY = { en: 'Woof! Woof!', tr: 'Hav hav!', es: '¡Guau, guau!' };
