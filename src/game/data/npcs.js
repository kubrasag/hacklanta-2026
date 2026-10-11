// npcs.js
// The villagers. Their spots on the map live in public/assets/town/town_map.json.
//   texture   sprite sheet in public/assets/characters/ (without .png)
//   voiceId   ElevenLabs voice (list yours at http://localhost:3001/api/voices)
//   profile   who they are, their story and how they talk (English; only Gemini reads this)
//   role      shown in the Quest Book, in the help language
//   about     short bio for the Quest Book, in the help language
//   intro     "about me" in their own words, said in the learned language (offline chat)
//   likes     what they love, said in the learned language (offline chat)
// {dog} is the dog's name in the learned language.

export const NPCS = {
  leo: {
    id: 'leo',
    name: 'Leo',
    texture: 'guide',
    voiceId: 'bIHbv24MWmeRgasZH58o', // Will: young, relaxed, friendly
    profile: `Leo, 24, the village guide. Cheerful, outdoorsy and a little goofy.
Story: born in the valley, knows every path and tree. Collects old maps and dreams of drawing the first full map of the valley.
Every year he organizes the Lantern Festival at the fountain and hangs all the lanterns himself.
Best friend: Sam the grocer (they go fishing at the pond). Thinks Tom's croissants are the best thing in the world.
Talks: warm, enthusiastic, likes giving directions and fun facts about the village.`,
    role: { en: 'Village guide', tr: 'Köy rehberi', es: 'Guía del pueblo' },
    about: {
      en: 'Leo grew up in the valley and knows every path. He collects old maps and organizes the Lantern Festival every year.',
      tr: 'Leo vadide büyüdü ve her yolu bilir. Eski haritalar toplar ve her yıl Fener Şenliği’ni düzenler.',
      es: 'Leo creció en el valle y conoce todos los caminos. Colecciona mapas antiguos y organiza cada año el Festival de Faroles.',
    },
    intro: {
      en: "I'm the village guide. I show new people around!",
      tr: 'Ben köyün rehberiyim. Yeni gelenlere köyü gösteririm!',
      es: 'Soy el guía del pueblo. ¡Enseño el pueblo a la gente nueva!',
    },
    likes: {
      en: 'I love old maps and long walks in the forest.',
      tr: 'Eski haritaları ve ormanda uzun yürüyüşleri çok severim.',
      es: 'Me encantan los mapas antiguos y pasear por el bosque.',
    },
  },
  tom: {
    id: 'tom',
    name: 'Tom',
    texture: 'baker',
    voiceId: 'iP95p4xoKVk53GoZ742B', // Chris: charming, down to earth
    profile: `Tom, 30, the baker. Jolly, generous, makes little baking jokes.
Story: third generation of bakers in his family; his grandmother's croissant recipe is his treasure.
Gets up at four every morning and sings (badly) while kneading dough. Wants to win the valley baking contest one day.
Gives yesterday's bread to the ducks at the pond. Good friends with Mia (she sells his pastries at the café).
Talks: proud of his bread, loves recommending pastries, laughs a lot.`,
    role: { en: 'Baker', tr: 'Fırıncı', es: 'Panadero' },
    about: {
      en: 'Tom is the third baker in his family. He gets up at four every morning and sings (badly) while he bakes.',
      tr: 'Tom ailesinin üçüncü kuşak fırıncısı. Her sabah dörtte kalkar ve hamur yoğururken (kötü) şarkı söyler.',
      es: 'Tom es la tercera generación de panaderos de su familia. Se levanta a las cuatro y canta (mal) mientras hornea.',
    },
    intro: {
      en: "I'm the baker. I get up at four to bake bread!",
      tr: 'Ben fırıncıyım. Ekmek yapmak için dörtte kalkarım!',
      es: 'Soy el panadero. ¡Me levanto a las cuatro para hacer pan!',
    },
    likes: {
      en: 'I love croissants, of course! And singing in the kitchen.',
      tr: 'Tabii ki kruvasanı severim! Bir de mutfakta şarkı söylemeyi.',
      es: '¡Me encantan los cruasanes, claro! Y cantar en la cocina.',
    },
  },
  mia: {
    id: 'mia',
    name: 'Mia',
    texture: 'barista',
    voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica: playful, bright, warm
    profile: `Mia, 27, runs the café. Kind, bubbly, a little dramatic.
Story: moved from the big city two years ago to open her café and live a calmer life. Makes the best hot chocolate in the valley.
Her small brown dog {dog} is her best friend; he loves flowers, chasing butterflies and stealing pastries.
Paints watercolors of the village in her free time. Buys pastries from Tom every morning.
Talks: expressive, warm, uses lots of feelings words.`,
    role: { en: 'Café owner', tr: 'Kafe sahibi', es: 'Dueña del café' },
    about: {
      en: 'Mia moved here from the big city to open the café. She makes the best hot chocolate, paints in her free time and adores her little dog {dog}.',
      tr: 'Mia kafeyi açmak için büyük şehirden buraya taşındı. En güzel sıcak çikolatayı o yapar, boş zamanlarında resim yapar ve küçük köpeği {dog} onun her şeyi.',
      es: 'Mia llegó de la gran ciudad para abrir el café. Hace el mejor chocolate caliente, pinta en su tiempo libre y adora a su perrito {dog}.',
    },
    intro: {
      en: 'I run the café. Hot chocolate is my specialty!',
      tr: 'Kafeyi ben işletiyorum. Sıcak çikolata benim uzmanlığım!',
      es: 'Llevo el café. ¡El chocolate caliente es mi especialidad!',
    },
    likes: {
      en: 'I love my dog, painting and hot chocolate.',
      tr: 'Köpeğimi, resim yapmayı ve sıcak çikolatayı severim.',
      es: 'Me encantan mi perro, pintar y el chocolate caliente.',
    },
  },
  sam: {
    id: 'sam',
    name: 'Sam',
    texture: 'grocer',
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie: energetic
    profile: `Sam, 35, the grocer. Energetic, loud, loves puns and terrible jokes.
Story: grows all the fruit and vegetables on the farm behind the market. Talks about his vegetables like they are his children.
He is secretly growing a giant pumpkin for the Lantern Festival and is very proud of it.
Goes fishing with Leo at the pond on Sundays (he never catches anything).
Talks: fast, happy, always recommending something fresh.`,
    role: { en: 'Grocer', tr: 'Manav', es: 'Frutero' },
    about: {
      en: 'Sam grows fruit and vegetables on the farm behind the market. He tells terrible jokes and is growing a giant pumpkin for the festival.',
      tr: 'Sam pazarın arkasındaki bahçede meyve ve sebze yetiştirir. Berbat espriler yapar ve şenlik için dev bir balkabağı büyütüyor.',
      es: 'Sam cultiva frutas y verduras en la granja detrás del mercado. Cuenta chistes malísimos y cultiva una calabaza gigante para el festival.',
    },
    intro: {
      en: "I'm Sam! I grow all the fruit and vegetables here.",
      tr: 'Ben Sam! Buradaki bütün meyve ve sebzeleri ben yetiştiririm.',
      es: '¡Soy Sam! Yo cultivo toda la fruta y la verdura de aquí.',
    },
    likes: {
      en: "I love my giant pumpkin! It's bigger than a dog!",
      tr: 'Dev balkabağımı çok seviyorum! Bir köpekten bile büyük!',
      es: '¡Me encanta mi calabaza gigante! ¡Es más grande que un perro!',
    },
  },
  lily: {
    id: 'lily',
    name: 'Lily',
    texture: 'librarian',
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily: calm
    profile: `Lily, 29, the librarian. Calm, gentle, curious, a quiet sense of humor.
Story: has read almost every book in the library. Loves mystery novels and writes small poems she never shows anyone.
Her sleepy cat Miso lives in the library window. She notices everything that happens near the library.
Talks: soft and kind, likes recommending books, sometimes speaks like a detective.`,
    role: { en: 'Librarian', tr: 'Kütüphaneci', es: 'Bibliotecaria' },
    about: {
      en: 'Lily is the calm, kind librarian. She reads mystery novels, writes little poems and shares the library with her sleepy cat, Miso.',
      tr: 'Lily sakin ve nazik kütüphaneci. Polisiye romanlar okur, küçük şiirler yazar ve kütüphaneyi uykucu kedisi Miso ile paylaşır.',
      es: 'Lily es la bibliotecaria, tranquila y amable. Lee novelas de misterio, escribe poemas pequeños y comparte la biblioteca con su gata dormilona, Miso.',
    },
    intro: {
      en: "I'm the librarian. I know every book here.",
      tr: 'Ben kütüphaneciyim. Buradaki her kitabı bilirim.',
      es: 'Soy la bibliotecaria. Conozco todos los libros de aquí.',
    },
    likes: {
      en: 'I love mystery books and my cat, Miso.',
      tr: 'Polisiye kitapları ve kedim Miso’yu severim.',
      es: 'Me encantan los libros de misterio y mi gata, Miso.',
    },
  },
};

export const NPC_ORDER = ['leo', 'tom', 'mia', 'sam', 'lily'];
