import type { LatLng } from '../types'

export interface StreetSuggestion extends LatLng {
  nome: string
  bairro: string
  tipo: string
}

/** Ruas, avenidas e alamedas de Três Lagoas - MS usadas na sugestão offline. */
export const BANCO_RUAS_TRES_LAGOAS: StreetSuggestion[] = [
  // AVENIDAS PRINCIPAIS
  { nome: 'Avenida Capitão Olinto Mancini', bairro: 'Centro / Colinos / Jardim Alvorada', tipo: 'Avenida', lat: -20.7848, lng: -51.7001 },
  { nome: 'Avenida Filinto Müller', bairro: 'Centro / Vila Nova / Jardim Primavera', tipo: 'Avenida', lat: -20.7876, lng: -51.6974 },
  { nome: 'Avenida Advogado Rosário Congro', bairro: 'Centro / Santos Dumont', tipo: 'Avenida', lat: -20.7862, lng: -51.7031 },
  { nome: 'Avenida Antônio Trajano dos Santos', bairro: 'Centro / Vila Nova', tipo: 'Avenida', lat: -20.7891, lng: -51.7012 },
  { nome: 'Avenida Dr. Eloy Chaves', bairro: 'Santos Dumont / Centro / Paranapunga', tipo: 'Avenida', lat: -20.783, lng: -51.7055 },
  { nome: 'Avenida Clodoaldo Garcia', bairro: 'Santos Dumont / Vila Haro', tipo: 'Avenida', lat: -20.796, lng: -51.688 },
  { nome: 'Avenida Aldair Rosa de Oliveira', bairro: 'Interlagos / Circular da Lagoa', tipo: 'Avenida', lat: -20.7812, lng: -51.711 },
  { nome: 'Avenida Ranulpho Marques Leal', bairro: 'Jardim Alvorada / BR-262', tipo: 'Avenida', lat: -20.7745, lng: -51.683 },
  { nome: 'Avenida Ponta Porã', bairro: 'Vila Popular / Jardim Primavera', tipo: 'Avenida', lat: -20.799, lng: -51.708 },
  { nome: 'Avenida Baldomero Leituga', bairro: 'Jardim Capilé / Interlagos', tipo: 'Avenida', lat: -20.776, lng: -51.715 },
  { nome: 'Avenida Sobral', bairro: 'Jardim Oiti / Lapa', tipo: 'Avenida', lat: -20.7915, lng: -51.718 },
  { nome: 'Avenida Jiro Morimoto', bairro: 'Distrito Industrial', tipo: 'Avenida', lat: -20.765, lng: -51.662 },
  { nome: 'Avenida Perimetral Leste', bairro: 'Distrito Industrial / Cinturão Verde', tipo: 'Avenida', lat: -20.762, lng: -51.658 },
  { nome: 'Avenida Professor João Thomés', bairro: 'Jardim Alvorada / Santos Dumont', tipo: 'Avenida', lat: -20.7715, lng: -51.692 },
  { nome: 'Avenida Circular', bairro: 'Interlagos', tipo: 'Avenida', lat: -20.78, lng: -51.7125 },

  // RUAS PRINCIPAIS E SECUNDÁRIAS
  { nome: 'Rua Bruno García', bairro: 'Centro / Colinos', tipo: 'Rua', lat: -20.787, lng: -51.7005 },
  { nome: 'Rua Munir Thomé', bairro: 'Centro / Santa Luzia', tipo: 'Rua', lat: -20.7885, lng: -51.699 },
  { nome: 'Rua Orestes Prata Tibery', bairro: 'Centro / Jardim Primavera', tipo: 'Rua', lat: -20.7835, lng: -51.698 },
  { nome: 'Rua Zuleide Pérez Tabox', bairro: 'Centro / Vila Nova', tipo: 'Rua', lat: -20.785, lng: -51.6965 },
  { nome: 'Rua Crispim Coimbra', bairro: 'Centro / Santos Dumont', tipo: 'Rua', lat: -20.7895, lng: -51.704 },
  { nome: 'Rua João Silva', bairro: 'Centro / Lapa', tipo: 'Rua', lat: -20.782, lng: -51.702 },
  { nome: 'Rua Alfredo Justino de Souza', bairro: 'Centro / Vila Haro', tipo: 'Rua', lat: -20.7842, lng: -51.694 },
  { nome: 'Rua Egídio Thomé', bairro: 'Jardim JK / Interlagos', tipo: 'Rua', lat: -20.778, lng: -51.7085 },
  { nome: 'Rua Duque de Caxias', bairro: 'Vila Nova / Interlagos', tipo: 'Rua', lat: -20.781, lng: -51.695 },
  { nome: 'Rua Paranaíba', bairro: 'Centro / Colinos', tipo: 'Rua', lat: -20.7868, lng: -51.7018 },
  { nome: 'Rua João Carrato', bairro: 'Centro', tipo: 'Rua', lat: -20.7855, lng: -51.701 },
  { nome: 'Rua Maria Guilhermina Esteves', bairro: 'Nossa Senhora Aparecida / Santos Dumont', tipo: 'Rua', lat: -20.793, lng: -51.709 },
  { nome: 'Rua Generoso Siqueira', bairro: 'Centro / Jardim Carandá', tipo: 'Rua', lat: -20.788, lng: -51.6955 },
  { nome: 'Rua Angelina Tebet', bairro: 'Santa Luzia / Jardim Alvorada', tipo: 'Rua', lat: -20.779, lng: -51.691 },
  { nome: 'Rua Rafael de Haro', bairro: 'Vila Haro', tipo: 'Rua', lat: -20.7975, lng: -51.685 },

  // ALAMEDAS E VIELAS
  { nome: 'Alameda Célio de Barros', bairro: 'Nova Três Lagoas I', tipo: 'Alameda', lat: -20.769, lng: -51.685 },
  { nome: 'Alameda RM14', bairro: 'Residencial Montanini', tipo: 'Alameda', lat: -20.7585, lng: -51.6782 },
  { nome: 'Viela Professor Henrique José de Souza', bairro: 'Vila Nova / Guanabara', tipo: 'Viela', lat: -20.7805, lng: -51.698 },
]

export function removerAcentos(str: string): string {
  return str ? str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : ''
}

export function buscarRuas(termo: string, limite = 8): StreetSuggestion[] {
  const query = removerAcentos(termo.trim())
  if (!query) return []
  return BANCO_RUAS_TRES_LAGOAS.filter(
    (rua) => removerAcentos(rua.nome).includes(query) || removerAcentos(rua.bairro).includes(query),
  ).slice(0, limite)
}
