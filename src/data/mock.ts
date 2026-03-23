import { Loja, User, Corte, Apuracao, ItemApuracao, StatusApuracao } from '@/types';

export const lojas: Loja[] = Array.from({ length: 23 }, (_, i) => ({
  id: `loja-${i + 1}`,
  codigo: String(i + 1).padStart(2, '0'),
  nome: `Loja ${String(i + 1).padStart(2, '0')} - ${['Centro', 'Shopping', 'Bairro Norte', 'Av. Principal', 'Distrito Industrial', 'Vila Nova', 'Jardim América', 'Pq. das Flores', 'Setor Comercial', 'Rodoviária', 'Campus', 'Lago Sul', 'Asa Norte', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Águas Claras', 'Sobradinho', 'Planaltina', 'Gama', 'Santa Maria', 'Recanto', 'Brazlândia'][i]}`,
  cidade: ['São Paulo', 'Campinas', 'Ribeirão Preto', 'Sorocaba', 'Santos', 'São José dos Campos', 'Jundiaí', 'Piracicaba', 'Bauru', 'Marília', 'Presidente Prudente', 'Araraquara', 'São Carlos', 'Franca', 'Limeira', 'Taubaté', 'Guarujá', 'Mogi das Cruzes', 'Osasco', 'Guarulhos', 'Diadema', 'Carapicuíba', 'Itapevi'][i],
  uf: 'SP',
  ativa: i < 21,
}));

export const cortes: Corte[] = [
  { id: 'c1', codigo: '1066', descricao: 'C.BOV.ACEM R. P/KG', categoria: 'dianteiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 1, ativo: true },
  { id: 'c2', codigo: '1084', descricao: 'C.BOV.MUSCULO DIANT. RESF.P/KG', categoria: 'dianteiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 2, ativo: true },
  { id: 'c3', codigo: '1073', descricao: 'C.BOV.PA RESF. P/KG', categoria: 'dianteiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 3, ativo: true },
  { id: 'c4', codigo: '1080', descricao: 'C.BOV.PEITO RESF.P/KG', categoria: 'dianteiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 4, ativo: true },
  { id: 'c5', codigo: '1395', descricao: 'C.BOV.MOIDA P/KG', categoria: 'subproduto', exigePesoInicial: false, exigePesoFinal: true, ordem: 5, ativo: true },
  { id: 'c6', codigo: '1481', descricao: 'OSSO KG', categoria: 'subproduto', exigePesoInicial: true, exigePesoFinal: false, ordem: 6, ativo: true },
  { id: 'c7', codigo: '780', descricao: 'C.BOV.ALCATRA C/MAMINHA RESF. P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 7, ativo: true },
  { id: 'c8', codigo: '842', descricao: 'C.BOV.CAPA DE FILE RESF.P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 8, ativo: true },
  { id: 'c9', codigo: '847', descricao: 'C.BOV.CHA DENTRO RESF. P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 9, ativo: true },
  { id: 'c10', codigo: '863', descricao: 'C.BOV.CONTRA FILE RESF.P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 10, ativo: true },
  { id: 'c11', codigo: '896', descricao: 'C.BOV.FILE MIGNON RESF.P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 11, ativo: true },
  { id: 'c12', codigo: '906', descricao: 'C.BOV.LAGARTO PLANO RESF P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 12, ativo: true },
  { id: 'c13', codigo: '908', descricao: 'C.BOV.LAGARTO RED. RESF.P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 13, ativo: true },
  { id: 'c14', codigo: '911', descricao: 'C.BOV.MUSCULO TRAS RESF.P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 14, ativo: true },
  { id: 'c15', codigo: '925', descricao: 'C.BOV.PATINHO RESF.P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 15, ativo: true },
  { id: 'c16', codigo: '930', descricao: 'C.BOV.PICANHA RESF.P/KG', categoria: 'traseiro', exigePesoInicial: true, exigePesoFinal: true, ordem: 16, ativo: true },
];

export const usuarios: User[] = [
  { id: 'u1', nome: 'Carlos Administrador', email: 'admin@rede.com.br', perfil: 'admin', ativo: true },
  { id: 'u2', nome: 'Maria Gestora', email: 'gestor@rede.com.br', perfil: 'gestor', ativo: true },
  { id: 'u3', nome: 'João Prevenção', email: 'prevencao@rede.com.br', perfil: 'prevencao', ativo: true },
  ...lojas.slice(0, 10).map((l, i) => ({
    id: `u${i + 4}`,
    nome: `Operador ${l.codigo}`,
    email: `loja${l.codigo}@rede.com.br`,
    perfil: 'loja' as const,
    lojaId: l.id,
    ativo: true,
  })),
];

function gerarItens(tipo: 'dianteiro' | 'traseiro'): ItemApuracao[] {
  return cortes.filter(c => c.ativo).map(c => {
    const pesoInicial = +(Math.random() * 15 + 2).toFixed(2);
    const fator = c.codigo === '1481' ? 1 : (0.75 + Math.random() * 0.2);
    const pesoFinal = c.codigo === '1481' ? 0 : +(pesoInicial * fator).toFixed(2);
    const perdaKg = +(pesoInicial - pesoFinal).toFixed(2);
    const perdaPercentual = pesoInicial > 0 ? +((perdaKg / pesoInicial) * 100).toFixed(2) : 0;
    return {
      corteId: c.id,
      corteCodigo: c.codigo,
      corteDescricao: c.descricao,
      pesoInicial: c.exigePesoInicial ? pesoInicial : 0,
      pesoFinal: c.exigePesoFinal ? pesoFinal : 0,
      perdaKg,
      perdaPercentual,
    };
  });
}

function gerarApuracoes(): Apuracao[] {
  const result: Apuracao[] = [];
  const statuses: StatusApuracao[] = ['finalizada', 'finalizada', 'finalizada', 'revisada', 'rascunho'];
  let id = 1;
  for (const loja of lojas.filter(l => l.ativa)) {
    const count = Math.floor(Math.random() * 5) + 2;
    for (let j = 0; j < count; j++) {
      const tipo = Math.random() > 0.5 ? 'dianteiro' : 'traseiro';
      const itens = gerarItens(tipo);
      const totalPI = +itens.reduce((s, i) => s + i.pesoInicial, 0).toFixed(2);
      const totalPF = +itens.reduce((s, i) => s + i.pesoFinal, 0).toFixed(2);
      const totalPerda = +(totalPI - totalPF).toFixed(2);
      const mediaPerda = totalPI > 0 ? +((totalPerda / totalPI) * 100).toFixed(2) : 0;
      const day = Math.floor(Math.random() * 28) + 1;
      const month = Math.floor(Math.random() * 3) + 1;
      const dateStr = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({
        id: `ap-${id++}`,
        lojaId: loja.id,
        lojaNome: loja.nome,
        dataApuracao: dateStr,
        tipoApuracao: tipo,
        pesoCarcaca: +(Math.random() * 100 + 150).toFixed(2),
        sif: `SIF-${Math.floor(Math.random() * 9000) + 1000}`,
        observacoes: j === 0 ? 'Apuração padrão do período' : '',
        responsavel: `Operador ${loja.codigo}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        criadoEm: `${dateStr}T08:00:00`,
        atualizadoEm: `${dateStr}T10:30:00`,
        itens,
        totalPesoInicial: totalPI,
        totalPesoFinal: totalPF,
        totalPerdaKg: totalPerda,
        mediaPerdaPercentual: mediaPerda,
      });
    }
  }
  return result.sort((a, b) => b.dataApuracao.localeCompare(a.dataApuracao));
}

export const apuracoes: Apuracao[] = gerarApuracoes();
