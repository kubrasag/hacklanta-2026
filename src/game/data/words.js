// words.js
// The words and phrases (chunks) the village teaches. Each one has:
//   icon      a picture, so the meaning sticks (dual coding)
//   text      how it is written in each language (also shown as the meaning)
//   forms     spellings to underline in NPC lines (first one is the main form)
//   say       patterns that count as "the player used it" (simplified, "*" = prefix)

import { hasPattern } from '../core/text';

export const WORDS = {
  hello: {
    icon: '👋',
    text: { en: 'hello', tr: 'merhaba', es: 'hola' },
    forms: { en: ['hello', 'hi'], tr: ['merhaba', 'selam'], es: ['hola'] },
    say: { en: ['hello', 'hi', 'hey'], tr: ['merhaba', 'selam'], es: ['hola'] },
  },
  myname: {
    icon: '🙋',
    text: { en: 'my name is', tr: 'benim adım', es: 'me llamo' },
    forms: { en: ['my name is', "what's your name", 'your name'], tr: ['benim adım', 'adın ne', 'adım'], es: ['me llamo', 'te llamas'] },
    say: { en: ['my name', "i'm", 'i am', 'call me'], tr: ['adim', 'benim adim', 'ismim', 'ben'], es: ['me llamo', 'mi nombre', 'soy'] },
  },
  nicetomeet: {
    icon: '🤝',
    text: { en: 'nice to meet you', tr: 'memnun oldum', es: 'mucho gusto' },
    forms: { en: ['nice to meet you'], tr: ['memnun oldum'], es: ['mucho gusto', 'encantada', 'encantado'] },
    say: { en: ['nice to meet'], tr: ['memnun'], es: ['mucho gusto', 'encantad*'] },
  },
  welcome: {
    icon: '🏡',
    text: { en: 'welcome', tr: 'hoş geldin', es: 'bienvenida' },
    forms: { en: ['welcome'], tr: ['hoş geldin'], es: ['bienvenida', 'bienvenido'] },
    say: { en: ['welcome'], tr: ['hos geldin*'], es: ['bienvenid*'] },
  },
  goodmorning: {
    icon: '☀️',
    text: { en: 'good morning', tr: 'günaydın', es: 'buenos días' },
    forms: { en: ['good morning'], tr: ['günaydın'], es: ['buenos días'] },
    say: { en: ['good morning', 'morning'], tr: ['gunaydin'], es: ['buenos dias'] },
  },
  idlike: {
    icon: '🫴',
    text: { en: "I'd like", tr: 'istiyorum', es: 'quisiera' },
    forms: { en: ["I'd like", 'would you like'], tr: ['istiyorum', 'istersin'], es: ['quisiera', 'te gustaría'] },
    say: { en: ["i'd like", 'i would like', 'id like', 'can i have', 'could i have', 'i want'], tr: ['istiyorum', 'alabilir*', 'alayim', 'istiyom'], es: ['quisiera', 'me gustaria', 'quiero', 'me da*', 'me pone*', 'puedo tener'] },
  },
  please: {
    icon: '🙏',
    text: { en: 'please', tr: 'lütfen', es: 'por favor' },
    forms: { en: ['please'], tr: ['lütfen'], es: ['por favor'] },
    say: { en: ['please'], tr: ['lutfen'], es: ['por favor'] },
  },
  croissant: {
    icon: '🥐',
    text: { en: 'croissant', tr: 'kruvasan', es: 'cruasán' },
    forms: { en: ['croissants', 'croissant'], tr: ['kruvasanları', 'kruvasanı', 'kruvasan'], es: ['cruasanes', 'cruasán'] },
    say: { en: ['croissant*', 'crossant*', 'croisant*'], tr: ['kruvasan*', 'kurvasan*', 'kruasan*', 'croissant*'], es: ['cruasan*', 'croissant*', 'cruason*', 'croasan*'] },
  },
  thanks: {
    icon: '💛',
    text: { en: 'thank you', tr: 'teşekkürler', es: 'gracias' },
    forms: { en: ['thank you', 'thanks'], tr: ['teşekkürler', 'teşekkür ederim'], es: ['gracias'] },
    say: { en: ['thank*'], tr: ['tesekkur*', 'sag ol*', 'sagol*'], es: ['gracias'] },
  },
  dog: {
    icon: '🐶',
    text: { en: 'dog', tr: 'köpek', es: 'perro' },
    forms: { en: ['dogs', 'dog'], tr: ['köpekler', 'köpeğin', 'köpeğim', 'köpeği', 'köpek'], es: ['perros', 'perrito', 'perro'] },
    say: { en: ['dog*', 'puppy'], tr: ['kopek*', 'kopeg*'], es: ['perr*'] },
  },
  small: {
    icon: '🤏',
    text: { en: 'small', tr: 'küçük', es: 'pequeño' },
    forms: { en: ['small', 'little'], tr: ['küçük'], es: ['pequeño'] },
    say: { en: ['small', 'little'], tr: ['kucuk'], es: ['pequen*'] },
  },
  brown: {
    icon: '🟤',
    text: { en: 'brown', tr: 'kahverengi', es: 'marrón' },
    forms: { en: ['brown'], tr: ['kahverengi'], es: ['marrón'] },
    say: { en: ['brown'], tr: ['kahverengi'], es: ['marron', 'cafe'] },
  },
  library: {
    icon: '📚',
    text: { en: 'library', tr: 'kütüphane', es: 'biblioteca' },
    forms: { en: ['library'], tr: ['kütüphanenin', 'kütüphaneye', 'kütüphane'], es: ['biblioteca'] },
    say: { en: ['library'], tr: ['kutuphane*'], es: ['biblioteca'] },
  },
  help: {
    icon: '🤲',
    text: { en: 'I can help', tr: 'yardım edebilirim', es: 'puedo ayudar' },
    forms: { en: ['I can help', 'help'], tr: ['yardım edebilirim', 'yardım edebilir', 'yardım'], es: ['puedo ayudar', 'ayudar', 'ayuda'] },
    say: { en: ['help*'], tr: ['yardim*'], es: ['ayud*', 'te ayudo'] },
  },
  comehere: {
    icon: '👉',
    text: { en: 'come here', tr: 'gel', es: 'ven' },
    forms: { en: ['come here', 'come'], tr: ['gel'], es: ['ven'] },
    say: { en: ['come*', 'here boy'], tr: ['gel*'], es: ['ven', 'ven aqui', 'vente'] },
  },
  hereis: {
    icon: '🎁',
    text: { en: 'here is', tr: 'işte', es: 'aquí está' },
    forms: { en: ['here is', 'here you go'], tr: ['işte', 'buyur'], es: ['aquí está', 'aquí tienes'] },
    say: { en: ['here is', "here's", 'here you'], tr: ['iste', 'buyur*', 'al '], es: ['aqui esta', 'aqui tienes', 'aqui'] },
  },
  yes: {
    icon: '✅',
    text: { en: 'yes', tr: 'evet', es: 'sí' },
    forms: { en: ['yes'], tr: ['evet'], es: ['sí'] },
    say: { en: ['yes', 'yeah', 'sure', 'of course'], tr: ['evet', 'tabii', 'tabi', 'olur'], es: ['si', 'claro', 'vale'] },
  },
  apples: {
    icon: '🍎',
    text: { en: 'apples', tr: 'elma', es: 'manzanas' },
    forms: { en: ['apples', 'apple'], tr: ['elmalar', 'elma'], es: ['manzanas', 'manzana'] },
    say: { en: ['apple*'], tr: ['elma*'], es: ['manzana*'] },
  },
  three: {
    icon: '3️⃣',
    text: { en: 'three', tr: 'üç', es: 'tres' },
    forms: { en: ['three'], tr: ['üç'], es: ['tres'] },
    say: { en: ['three', '3'], tr: ['uc', '3'], es: ['tres', '3'] },
  },
  book: {
    icon: '📕',
    text: { en: 'book', tr: 'kitap', es: 'libro' },
    forms: { en: ['books', 'book'], tr: ['kitabınız', 'kitabın', 'kitap'], es: ['libros', 'libro'] },
    say: { en: ['book*'], tr: ['kitab*', 'kitap*'], es: ['libro*'] },
  },
  festival: {
    icon: '🏮',
    text: { en: 'festival', tr: 'şenlik', es: 'festival' },
    forms: { en: ['Lantern Festival', 'festival'], tr: ['Fener Şenliği', 'şenlik'], es: ['Festival de Faroles', 'festival'] },
    say: { en: ['festival'], tr: ['senlik*'], es: ['festival'] },
  },
};

// Was this word used in the sentence?

export function usedWord(sentence, wordId, lang) {
  const w = WORDS[wordId];
  if (!w) return false;
  return (w.say[lang] || []).some((p) => hasPattern(sentence, p));
}
