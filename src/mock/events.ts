export type EventMock = {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  location: string;
  dateLabel: string;
  priceLabel: string;
  chips: string[];
  image: any; // imagen principal (para Discover)
  images: any[]; // carousel (para detalle)
};

export const eventsMock: EventMock[] = [
  {
    id: "1",
    title: "Ruta gastronómica",
    description:
      "Un recorrido corto por sabores locales: arepas, dulces típicos y cafés artesanales.",
    fullDescription:
      "Explora una ruta gastronómica por el corazón de la ciudad. Probarás arepas tradicionales, dulces típicos y cafés artesanales mientras conoces historias y recomendaciones de locales. Ideal para ir con amigos o en plan relax. Incluye 3 paradas principales y tiempo libre para fotos.",
    location: "Getsemaní, Cartagena",
    dateLabel: "Hoy • 5:00 PM",
    priceLabel: "$25.000 COP",
    chips: ["Food", "Hoy", "Cartagena"],
    image: require("../../assets/images/getsemani-1.jpg"),
    images: [
      require("../../assets/images/getsemani-1.jpg"),
      require("../../assets/images/getsemani-2.jpg"),
      require("../../assets/images/getsemani-3.jpg"),
    ],
  },
  {
    id: "2",
    title: "Jam en Getsemaní",
    description:
      "Sesión abierta de improvisación musical con artistas locales. Nunca sabes qué sonará.",
    fullDescription:
      "Una jam íntima con músicos locales e invitados. El plan es simple: llegar, escuchar, disfrutar y dejarte sorprender. Hay espacios para improvisación y momentos acústicos. Recomendado si quieres vivir la vibra real del barrio. Aforo limitado.",
    location: "Plaza de la Trinidad, Cartagena",
    dateLabel: "Mañana • 8:00 PM",
    priceLabel: "Gratis",
    chips: ["Música", "Mañana", "Cartagena"],
    image: require("../../assets/images/jam-1.jpg"),
    images: [
      require("../../assets/images/jam-1.jpg"),
      require("../../assets/images/jam-2.jpg"),
      require("../../assets/images/jam-3.jpg"),
    ],
  },
  {
    id: "3",
    title: "Calles con Historia",
    description:
      "Recorre las calles más antiguas mientras descubres historias, leyendas y secretos arquitectónicos.",
    fullDescription:
      "Un tour guiado por calles emblemáticas, detalles arquitectónicos y relatos que no aparecen en los mapas. Caminata suave, paradas para fotos y datos curiosos. Perfecto para quien quiere entender la ciudad de una forma simple y bonita.",
    location: "Centro Histórico, Cartagena",
    dateLabel: "Sábado • 4:00 PM",
    priceLabel: "$18.000 COP",
    chips: ["Tour", "Sábado", "Cartagena"],
    image: require("../../assets/images/calles-1.jpg"),
    images: [
      require("../../assets/images/calles-1.jpg"),
      require("../../assets/images/calles-2.jpg"),
      require("../../assets/images/calles-3.jpg"),
    ],
  },
];
