export type UserRole = 'admin' | 'loja' | 'gestor' | 'prevencao';

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  lojaId?: string;
  ativo: boolean;
}

export interface Loja {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  uf: string;
  metodologia: Array<'boi_no_osso' | 'nota_10' | 'embalada'>;
  ativa: boolean;
}

export interface Corte {
  id: string;
  codigo: string;
  descricao: string;
  categoria: 'dianteiro' | 'traseiro' | 'subproduto';
  exigePesoInicial: boolean;
  exigePesoFinal: boolean;
  ordem: number;
  ativo: boolean;
}

export type StatusApuracao = 'rascunho' | 'finalizada' | 'revisada' | 'em_andamento';

export interface ItemApuracao {
  corteId: string;
  corteCodigo: string;
  corteDescricao: string;
  pesoInicial: number;
  pesoFinal: number;
  perdaKg: number;
  perdaPercentual: number;
}

export interface Apuracao {
  id: string;
  lojaId: string;
  lojaNome: string;
  dataApuracao: string;
  tipoApuracao: 'dianteiro' | 'traseiro';
  pesoCarcaca: number;
  sif: string;
  observacoes: string;
  responsavel: string;
  status: StatusApuracao;
  criadoEm: string;
  atualizadoEm: string;
  itens: ItemApuracao[];
  totalPesoInicial: number;
  totalPesoFinal: number;
  totalPerdaKg: number;
  mediaPerdaPercentual: number;
}

export interface KPIData {
  titulo: string;
  valor: string | number;
  variacao?: string;
  tipo?: 'positivo' | 'negativo' | 'neutro';
  icone?: string;
}
