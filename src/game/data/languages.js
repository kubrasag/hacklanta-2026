// languages.js
// The languages a player can learn, and the language they get help in.
// Every line in the game exists in all of them, so any pair works.

export const LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    native: 'English',
    greeting: 'Hello!',
    speech: 'en-US',         // browser speech fallback
    stt: 'en',               // ElevenLabs speech to text
    tts: 'en',               // ElevenLabs text to speech
    village: 'Clover Hollow',
    dog: 'Biscuit',
    friend: 'friend',
  },
  tr: {
    code: 'tr',
    name: 'Turkish',
    native: 'Türkçe',
    greeting: 'Merhaba!',
    speech: 'tr-TR',
    stt: 'tr',
    tts: 'tr',
    village: 'Yonca Vadisi',
    dog: 'Bisküvi',
    friend: 'dostum',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    native: 'Español',
    greeting: '¡Hola!',
    speech: 'es-ES',
    stt: 'es',
    tts: 'es',
    village: 'Valle Trébol',
    dog: 'Galleta',
    friend: 'amiga',
  },
};

export const LANGUAGE_ORDER = ['en', 'tr', 'es'];
