// Every building on the town map has a room and three story discoveries.
const line = (en, tr, es) => ({ en, tr, es });
export const INTERIORS = {
  bakery: {
    owner: 'tom', color: 0xb66d46, name: line('Tom’s bakery', 'Tom’un fırını', 'La panadería de Tom'),
    props: [
      { kind: 'oven', x: 110, y: 170, name: line('Old oven', 'Eski fırın', 'Horno antiguo'), text: line('Three generations of Tom’s family have baked bread in this oven. He still sings his grandmother’s songs.', 'Tom’un ailesinin üç kuşağı bu fırında ekmek yaptı. Hâlâ büyükannesinin şarkılarını söylüyor.', 'Tres generaciones de la familia de Tom han hecho pan en este horno. Aún canta las canciones de su abuela.') },
      { kind: 'desk', x: 460, y: 200, name: line('Recipe book', 'Tarif kitabı', 'Recetario'), text: line('A floury page holds Grandma’s croissant recipe. In the margin: “A little patience, a lot of butter.”', 'Unlu bir sayfada büyükannenin kruvasan tarifi var. Kenarında: “Biraz sabır, bol tereyağı.”', 'Una página llena de harina guarda la receta de cruasanes de la abuela: “Un poco de paciencia, mucha mantequilla”.') },
      { kind: 'table', x: 160, y: 300, name: line('Contest ribbon', 'Yarışma kurdelesi', 'Cinta del concurso'), text: line('Tom keeps an empty space for a baking prize. His first ribbon was for trying, and he is proud of it.', 'Tom bir fırıncılık ödülü için boş yer ayırmış. İlk kurdelesi denediği içindi ve onunla gurur duyuyor.', 'Tom guarda un espacio para un premio de panadería. Su primera cinta fue por participar y está orgulloso.') },
    ],
  },
  cafe: {
    owner: 'mia', color: 0x668b7c, name: line('Mia’s café', 'Mia’nın kafesi', 'El café de Mia'),
    props: [
      { kind: 'counter', x: 125, y: 180, name: line('Chocolate tin', 'Çikolata kutusu', 'Lata de chocolate'), text: line('Mia brought this tin from the city when she moved here. Her first customer was Tom, carrying a tray of pastries.', 'Mia buraya taşınırken bu kutuyu şehirden getirdi. İlk müşterisi, bir tepsi çörek taşıyan Tom’du.', 'Mia trajo esta lata de la ciudad. Su primer cliente fue Tom, con una bandeja de pasteles.') },
      { kind: 'painting', x: 480, y: 175, name: line('Watercolor', 'Suluboya', 'Acuarela'), text: line('Mia painted the village on her first morning here. A little brown paw print crosses the corner.', 'Mia buradaki ilk sabahında köyün resmini yaptı. Köşesinde küçük kahverengi bir pati izi var.', 'Mia pintó el pueblo en su primera mañana aquí. Una pequeña huella marrón cruza la esquina.') },
      { kind: 'bed', x: 465, y: 320, name: line('Biscuit’s basket', 'Köpeğin sepeti', 'Cesta del perrito'), text: line('A soft blanket and a chewed toy wait in the basket. Mia stitched tiny flowers around the edge.', 'Sepette yumuşak bir battaniye ve çiğnenmiş bir oyuncak var. Mia kenarına küçük çiçekler işlemiş.', 'Una manta suave y un juguete mordido esperan en la cesta. Mia bordó pequeñas flores en el borde.') },
    ],
  },
  market: {
    owner: 'sam', color: 0x8e944f, name: line('Sam’s farmhouse shop', 'Sam’ın çiftlik dükkânı', 'La tienda de Sam'),
    props: [
      { kind: 'crates', x: 120, y: 185, name: line('Seed box', 'Tohum kutusu', 'Caja de semillas'), text: line('Sam labels every seed with a silly nickname. The largest packet says “Future pumpkin champion”.', 'Sam her tohuma komik bir isim vermiş. En büyük pakette “Geleceğin balkabağı şampiyonu” yazıyor.', 'Sam pone un apodo gracioso a cada semilla. El paquete más grande dice “Futuro campeón de calabazas”.') },
      { kind: 'desk', x: 475, y: 185, name: line('Fishing journal', 'Balık günlüğü', 'Diario de pesca'), text: line('Sunday with Leo: zero fish, three jokes, one lovely afternoon. Sam underlined the last part twice.', 'Leo ile pazar günü: sıfır balık, üç şaka, harika bir öğleden sonra. Sam son kısmın altını iki kez çizmiş.', 'Domingo con Leo: cero peces, tres chistes y una tarde bonita. Sam subrayó la última parte dos veces.') },
      { kind: 'pumpkin', x: 145, y: 315, name: line('Growing chart', 'Büyüme çizelgesi', 'Tabla de crecimiento'), text: line('Daily pencil marks chart Sam’s giant pumpkin. He speaks to it every morning before opening the shop.', 'Günlük kalem izleri Sam’ın dev balkabağının büyümesini gösteriyor. Dükkânı açmadan önce her sabah onunla konuşuyor.', 'Marcas diarias muestran cómo crece la calabaza gigante de Sam. Le habla cada mañana antes de abrir la tienda.') },
    ],
  },
  library: {
    owner: 'lily', color: 0x77648f, name: line('Lily’s library', 'Lily’nin kütüphanesi', 'La biblioteca de Lily'),
    props: [
      { kind: 'shelf', x: 120, y: 175, name: line('Poetry shelf', 'Şiir rafı', 'Estante de poesía'), text: line('A tiny unsigned poem sits between mystery novels: “Each lantern, a word. Each window, a story.”', 'Polisiye romanlar arasında imzasız küçük bir şiir var: “Her fener bir kelime. Her pencere bir hikâye.”', 'Un poema sin firma descansa entre novelas: “Cada farol, una palabra. Cada ventana, una historia”.') },
      { kind: 'desk', x: 465, y: 190, name: line('Leo’s old map', 'Leo’nun eski haritası', 'El mapa de Leo'), text: line('Leo drew this map as a child. Lily kept it safe. A dotted path ends at a question mark: he still wants to finish it.', 'Leo bu haritayı çocukken çizmiş. Lily onu saklamış. Noktalı yol bir soru işaretinde bitiyor: Leo hâlâ tamamlamak istiyor.', 'Leo dibujó este mapa de niño. Lily lo guardó. Un camino termina en un signo de interrogación: aún quiere completarlo.') },
      { kind: 'bed', x: 460, y: 315, name: line('Miso’s cushion', 'Miso’nun minderi', 'Cojín de Miso'), text: line('A warm cushion faces the garden. Lily says Miso is the only reader who sleeps through every mystery.', 'Sıcak bir minder bahçeye bakıyor. Lily, Miso’nun her polisiyede uyuyan tek okur olduğunu söylüyor.', 'Un cojín cálido mira al jardín. Lily dice que Miso es la única lectora que duerme durante todos los misterios.') },
    ],
  },
};
