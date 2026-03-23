import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileDown, FileSpreadsheet, Loader2, TrendingDown, BarChart3, Store, FileText, Calendar
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ──────────────────────────────────────────────────────────────────
interface LojaOpt { id: string; codigo: string; nome: string; }

interface Apuracao {
  id: string;
  data_apuracao: string;
  loja_id: string;
  tipo_apuracao: string;
  total_peso_inicial: number;
  total_peso_final: number;
  total_perda_kg: number;
  media_perda_percentual: number;
  responsavel: string;
  status: string;
  lojas: { nome: string; codigo: string } | null;
}

interface ItemApuracao {
  apuracao_id: string;
  corte_codigo: string;
  corte_descricao: string;
  peso_inicial: number;
  peso_final: number;
  perda_kg: number;
  perda_percentual: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  boi_no_osso: 'Boi no Osso',
  nota_10: 'Açougue Nota 10',
  embalada: 'Carne Embalada',
};

function fmt(n: number, dec = 2) { return n.toFixed(dec); }
function fmtDate(d: string) { return format(new Date(d), 'dd/MM/yyyy'); }

// ─── CSV helpers ─────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF';
  const content = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
  ).join('\n');
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────
function createPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm");

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.width, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Gestão de Apuração Açougue', 14, 11);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 19);
  doc.setFontSize(8);
  doc.text(`Emitido em: ${now}`, doc.internal.pageSize.width - 14, 11, { align: 'right' });
  doc.text(subtitle, doc.internal.pageSize.width - 14, 19, { align: 'right' });

  autoTable(doc, {
    head: [headers],
    body: rows.map(r => r.map(String)),
    startY: 34,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 6, { align: 'center' });
  }

  doc.save(filename);
}

// ─── Report Card ─────────────────────────────────────────────────────────────
interface ReportCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onCSV?: () => Promise<void>;
  onPDF: () => Promise<void>;
  onPreview?: () => void;
  loading: boolean;
  color: string;
}

function ReportCard({ icon: Icon, title, description, onCSV, onPDF, onPreview, loading, color }: ReportCardProps) {
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleCSV = async () => { if(onCSV) { setCsvLoading(true); try { await onCSV(); } finally { setCsvLoading(false); } } };
  const handlePDF = async () => { setPdfLoading(true); try { await onPDF(); } finally { setPdfLoading(false); } };

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1.5 ${color}`} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-lg bg-muted`}>
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          {onPreview && (
            <Button
              size="sm" variant="secondary" className="basis-full gap-1.5 text-xs mb-1"
              onClick={onPreview} disabled={loading}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Pré-visualizar na Tela
            </Button>
          )}
          {onCSV && (
            <Button
              size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
              onClick={handleCSV} disabled={loading || csvLoading || pdfLoading}
            >
              {csvLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Exportar CSV
            </Button>
          )}
          <Button
            size="sm" className="flex-1 gap-1.5 text-xs"
            onClick={handlePDF} disabled={loading || csvLoading || pdfLoading}
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin' || user?.perfil === 'gestor' || user?.perfil === 'prevencao';

  const [loading, setLoading] = useState(true);
  const [lojas, setLojas] = useState<LojaOpt[]>([]);
  const [apuracoes, setApuracoes] = useState<Apuracao[]>([]);
  const [allItens, setAllItens] = useState<ItemApuracao[]>([]);

  // Filters
  const [dataIni, setDataIni] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [classe, setClasse] = useState('todas');
  const [filtroLoja, setFiltroLoja] = useState('todas');
  const [limiteResultados, setLimiteResultados] = useState('todas');
  
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [lojasRes, apRes, itensRes] = await Promise.all([
        supabase.from('lojas').select('id, codigo, nome').eq('ativa', true).order('nome'),
        supabase
          .from('apuracoes')
          .select('id, data_apuracao, loja_id, tipo_apuracao, total_peso_inicial, total_peso_final, total_perda_kg, media_perda_percentual, responsavel, status, lojas(nome, codigo)')
          .neq('status', 'rascunho')
          .gte('data_apuracao', new Date(dataIni).toISOString())
          .lte('data_apuracao', new Date(dataFim + 'T23:59:59').toISOString())
          .order('data_apuracao', { ascending: false }),
        supabase
          .from('itens_apuracao')
          .select('apuracao_id, corte_codigo, corte_descricao, peso_inicial, peso_final, perda_kg, perda_percentual'),
      ]);

      const apData = (apRes.data || []) as unknown as Apuracao[];
      setLojas(lojasRes.data || []);
      setApuracoes(apData);
      setAllItens((itensRes.data as ItemApuracao[]) || []);
    } catch {
      toast.error('Erro ao carregar dados para relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Apply filters in-memory ────────────────────────────────────────────
  const filtered = apuracoes.filter(a => {
    if (classe !== 'todas' && a.tipo_apuracao !== classe) return false;
    if (filtroLoja !== 'todas' && a.loja_id !== filtroLoja) return false;
    if (!isAdmin && user?.lojaId && a.loja_id !== user.lojaId) return false;
    return true;
  });

  const filteredIds = new Set(filtered.map(a => a.id));
  const filteredItens = allItens.filter(i => filteredIds.has(i.apuracao_id));

  const periodoStr = `${format(new Date(dataIni), 'dd/MM/yyyy')} a ${format(new Date(dataFim), 'dd/MM/yyyy')}`;
  const lojaStr = filtroLoja === 'todas' ? 'Todas as lojas' : lojas.find(l => l.id === filtroLoja)?.nome || '';
  const classeStr = classe === 'todas' ? 'Todas as classes' : TIPO_LABEL[classe] || classe;
  const subtitle = `${periodoStr} | ${classeStr} | ${lojaStr}`;

  // ─── Shared Matrix Report Data ───────────────────────────────────────────
  const matrixData = useMemo(() => {
    if (filtered.length === 0) return null;

    const lojasMap = new Map<string, { id: string; nome: string; codigo: string }>();
    filtered.forEach(a => {
      if (!lojasMap.has(a.loja_id)) {
        lojasMap.set(a.loja_id, {
          id: a.loja_id,
          nome: a.lojas?.nome || 'Desconhecida',
          codigo: a.lojas?.codigo || a.loja_id,
        });
      }
    });
    const colLojas = Array.from(lojasMap.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));

    const cortesMap = new Map<string, { descricao: string; perdaTotal: number }>();
    filteredItens.forEach(i => {
      if (!cortesMap.has(i.corte_codigo)) cortesMap.set(i.corte_codigo, { descricao: i.corte_descricao, perdaTotal: 0 });
      cortesMap.get(i.corte_codigo)!.perdaTotal += Number(i.perda_percentual); // Consider relative percentage for the worst
    });
    
    let linhasCortes = Array.from(cortesMap.entries())
      .map(([codigo, v]) => ({ codigo, descricao: v.descricao, perdaTotal: v.perdaTotal }))
      .sort((a, b) => b.perdaTotal - a.perdaTotal);

    if (limiteResultados !== 'todas') {
      linhasCortes = linhasCortes.slice(0, Number(limiteResultados));
    }

    const headers = ['Código', 'Descrição do Corte', ...colLojas.map(l => l.codigo), 'Média Loja'];

    const rows: (string | number)[][] = [];
    const perdasLoja = new Map<string, { somaPct: number; qtd: number }>();
    filtered.forEach(a => {
      if (!perdasLoja.has(a.loja_id)) perdasLoja.set(a.loja_id, { somaPct: 0, qtd: 0 });
      const lc = perdasLoja.get(a.loja_id)!;
      lc.somaPct += Number(a.media_perda_percentual || 0);
      lc.qtd += 1;
    });

    linhasCortes.forEach(corte => {
      const rowData: (string | number)[] = [corte.codigo, corte.descricao];
      let somaLinha = 0;
      let qtdLojasCorte = 0;

      colLojas.forEach(loja => {
        const apLoja = filtered.filter(a => a.loja_id === loja.id);
        const apLojaIds = new Set(apLoja.map(a => a.id));
        const itensCorteLoja = filteredItens.filter(i => apLojaIds.has(i.apuracao_id) && i.corte_codigo === corte.codigo);

        if (itensCorteLoja.length > 0) {
          const mediaCorteLoja = itensCorteLoja.reduce((s, i) => s + Number(i.perda_percentual), 0) / itensCorteLoja.length;
          rowData.push(`${fmt(mediaCorteLoja)}%`);
          somaLinha += mediaCorteLoja;
          qtdLojasCorte++;
        } else {
          rowData.push('');
        }
      });
      rowData.push(qtdLojasCorte > 0 ? `${fmt(somaLinha / qtdLojasCorte)}%` : '');
      rows.push(rowData);
    });

    const footerRow: (string | number)[] = ['CARCAÇA TOTAL', ''];
    let somaTotalGlobal = 0;
    let qtdGlobal = 0;

    colLojas.forEach(loja => {
      const st = perdasLoja.get(loja.id);
      if (st && st.qtd > 0) {
        const mediaLoja = st.somaPct / st.qtd;
        footerRow.push(`${fmt(mediaLoja)}%`);
        somaTotalGlobal += mediaLoja;
        qtdGlobal++;
      } else {
        footerRow.push('');
      }
    });

    const avgFinal = qtdGlobal > 0 ? somaTotalGlobal / qtdGlobal : 0;
    footerRow.push(avgFinal > 0 ? `${fmt(avgFinal)}%` : '');

    return { colLojas, linhasCortes, headers, rows, footerRow, avgFinal };
  }, [filtered, filteredItens]);

  // ─── Report 1: Relatório Geral ─────────────────────────────────────────
  const rel1Headers = ['Nº', 'Data', 'Loja', 'Classe', 'Peso Inicial (kg)', 'Peso Final (kg)', 'Perda (kg)', 'Perda %', 'Status', 'Responsável'];
  const rel1Rows = (): (string | number)[][] => filtered.map((a, i) => [
    i + 1,
    fmtDate(a.data_apuracao),
    a.lojas?.nome || a.loja_id,
    TIPO_LABEL[a.tipo_apuracao] || a.tipo_apuracao,
    fmt(Number(a.total_peso_inicial)),
    fmt(Number(a.total_peso_final)),
    fmt(Number(a.total_perda_kg)),
    `${fmt(Number(a.media_perda_percentual))}%`,
    a.status,
    a.responsavel,
  ]);

  const onRel1CSV = async () => {
    downloadCSV(`Relatorio_Geral_${format(new Date(), 'ddMMyyy')}.csv`, rel1Headers, rel1Rows());
  };
  const onRel1PDF = async () => {
    createPDF('Relatório Geral de Apurações', subtitle, rel1Headers, rel1Rows(), `Relatorio_Geral_${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

  // ─── Report 2: Ranking por Loja ────────────────────────────────────────
  const rel2Headers = ['Pos.', 'Loja', 'Nº Apurações', 'Total Peso Inicial (kg)', 'Total Perda (kg)', 'Média Perda %'];
  const rel2Rows = (): (string | number)[][] => {
    const lojaMap = new Map<string, { nome: string; count: number; pi: number; perda: number; pctSum: number }>();
    filtered.forEach(a => {
      const nome = a.lojas?.nome || a.loja_id;
      if (!lojaMap.has(a.loja_id)) lojaMap.set(a.loja_id, { nome, count: 0, pi: 0, perda: 0, pctSum: 0 });
      const e = lojaMap.get(a.loja_id)!;
      e.count++; e.pi += Number(a.total_peso_inicial); e.perda += Number(a.total_perda_kg); e.pctSum += Number(a.media_perda_percentual);
    });
    let sortedList = Array.from(lojaMap.values()).sort((a, b) => b.perda - a.perda);
    if (limiteResultados !== 'todas') sortedList = sortedList.slice(0, Number(limiteResultados));
    return sortedList.map((l, i) => [i + 1, l.nome, l.count, fmt(l.pi), fmt(l.perda), `${fmt(l.count > 0 ? l.pctSum / l.count : 0)}%`]);
  };

  const onRel2CSV = async () => downloadCSV(`Ranking_Lojas_${format(new Date(), 'ddMMyyyy')}.csv`, rel2Headers, rel2Rows());
  const onRel2PDF = async () => createPDF('Ranking de Perdas por Loja', subtitle, rel2Headers, rel2Rows(), `Ranking_Lojas_${format(new Date(), 'ddMMyyyy')}.pdf`);

  // ─── Report 3: Ranking por Corte ───────────────────────────────────────
  const rel3Headers = ['Pos.', 'Código', 'Descrição do Corte', 'Total Peso Inicial (kg)', 'Total Perda (kg)', 'Média Perda %'];
  const rel3Rows = (): (string | number)[][] => {
    const corteMap = new Map<string, { descricao: string; pi: number; perda: number; pctSum: number; count: number }>();
    filteredItens.forEach(i => {
      if (!corteMap.has(i.corte_codigo)) corteMap.set(i.corte_codigo, { descricao: i.corte_descricao, pi: 0, perda: 0, pctSum: 0, count: 0 });
      const e = corteMap.get(i.corte_codigo)!;
      e.pi += Number(i.peso_inicial); e.perda += Number(i.perda_kg); e.pctSum += Number(i.perda_percentual); e.count++;
    });
    let sortedCortes = Array.from(corteMap.entries()).sort(([, a], [, b]) => b.perda - a.perda);
    if (limiteResultados !== 'todas') sortedCortes = sortedCortes.slice(0, Number(limiteResultados));
    return sortedCortes.map(([cod, c], i) => [i + 1, cod, c.descricao, fmt(c.pi), fmt(c.perda), `${fmt(c.count > 0 ? c.pctSum / c.count : 0)}%`]);
  };

  const onRel3CSV = async () => downloadCSV(`Ranking_Cortes_${format(new Date(), 'ddMMyyyy')}.csv`, rel3Headers, rel3Rows());
  const onRel3PDF = async () => createPDF('Ranking de Perdas por Corte', subtitle, rel3Headers, rel3Rows(), `Ranking_Cortes_${format(new Date(), 'ddMMyyyy')}.pdf`);

  // ─── Report 4: Evolução Mensal ─────────────────────────────────────────
  const rel4Headers = ['Mês/Ano', 'Nº Apurações', 'Total Peso Inicial (kg)', 'Total Perda (kg)', 'Média Perda %'];
  const rel4Rows = (): (string | number)[][] => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthMap = new Map<string, { count: number; pi: number; perda: number; pctSum: number }>();
    filtered.forEach(a => {
      const d = new Date(a.data_apuracao);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) monthMap.set(key, { count: 0, pi: 0, perda: 0, pctSum: 0 });
      const e = monthMap.get(key)!;
      e.count++; e.pi += Number(a.total_peso_inicial); e.perda += Number(a.total_perda_kg); e.pctSum += Number(a.media_perda_percentual);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        return [`${meses[parseInt(m) - 1]}/${y}`, v.count, fmt(v.pi), fmt(v.perda), `${fmt(v.count > 0 ? v.pctSum / v.count : 0)}%`];
      });
  };

  const onRel4CSV = async () => downloadCSV(`Evolucao_Mensal_${format(new Date(), 'ddMMyyyy')}.csv`, rel4Headers, rel4Rows());
  const onRel4PDF = async () => createPDF('Evolução Mensal de Perdas', subtitle, rel4Headers, rel4Rows(), `Evolucao_Mensal_${format(new Date(), 'ddMMyyyy')}.pdf`);

  // ─── Report 5: Apuração Matricial ──────────────────────────────────────────
  const onRelMatrizPDF = async () => {
    if (!matrixData) {
      toast.error('Nenhum dado encontrado para gerar a matriz.');
      return;
    }

    const { headers, rows, footerRow } = matrixData;

    // Gerar o PDF Customizado
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    
    // Título igual da Planilha
    const descAp = classe === 'todas' ? 'GERAL' : (TIPO_LABEL[classe] || classe).toUpperCase();
    doc.text(`APURAÇÃO AÇOUGUE ${descAp}`, doc.internal.pageSize.width / 2, 14, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`PERÍODO: ${format(new Date(dataIni), 'dd/MM/yyyy')} Á ${format(new Date(dataFim), 'dd/MM/yyyy')}`, doc.internal.pageSize.width / 2, 22, { align: 'center' });

    autoTable(doc, {
      head: [headers],
      body: rows,
      foot: [footerRow],
      startY: 32,
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [126, 178, 224], textColor: 0, fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: [230, 160, 100], textColor: 0, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fillColor: [180, 205, 230] }, // Código
        1: { halign: 'left', fillColor: [180, 205, 230] }, // Descrição
        [headers.length - 1]: { fillColor: [210, 235, 210] }, // Média Loja verde claro
      },
      didParseCell: function (data) {
        // Footer "CARCAÇA TOTAL" em destaque, o último em amarelo
        if (data.section === 'foot') {
          if (data.column.index === 0) {
            data.cell.styles.halign = 'center';
            data.cell.colSpan = 2; // Mesclar colCód com colDesc
          }
          if (data.column.index === headers.length - 1) {
            data.cell.styles.fillColor = [255, 255, 0]; // Amarelo
          }
        }
      },
    });

    // Assinaturas baseadas na planilha
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    
    doc.setFontSize(10);
    doc.rect(14, finalY + 5, 100, 20);
    doc.text('AUTOR', 64, finalY + 12, { align: 'center' });
    doc.text(user?.nome.toUpperCase() || 'USUÁRIO DO SISTEMA', 64, finalY + 18, { align: 'center' });

    doc.rect(doc.internal.pageSize.width - 114, finalY + 5, 100, 20);
    doc.text('AUTORIZADO', doc.internal.pageSize.width - 64, finalY + 12, { align: 'center' });
    doc.text('GESTOR/PREVENÇÃO E PERDAS', doc.internal.pageSize.width - 64, finalY + 18, { align: 'center' });

    doc.save(`Apuracao_Matricial_${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

  // ─── Stat summary bar ──────────────────────────────────────────────────
  const totalApuracoes = filtered.length;
  const totalPerdaKg = filtered.reduce((s, a) => s + Number(a.total_perda_kg), 0);
  const avgPerda = filtered.length > 0
    ? filtered.reduce((s, a) => s + Number(a.media_perda_percentual), 0) / filtered.length
    : 0;
  const totalLojas = new Set(filtered.map(a => a.loja_id)).size;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-description">Centro de emissão de relatórios gerenciais — exporte em PDF ou CSV</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Filtros do Relatório
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Data Inicial</Label>
            <Input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className="h-9 w-36" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Data Final</Label>
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-9 w-36" />
          </div>
          <div className="space-y-1.5 w-44">
            <Label className="text-xs text-muted-foreground">Classe de Apuração</Label>
            <Select value={classe} onValueChange={setClasse}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="boi_no_osso">Boi no Osso</SelectItem>
                <SelectItem value="nota_10">Açougue Nota 10</SelectItem>
                <SelectItem value="embalada">Carne Embalada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 w-44">
            <Label className="text-xs text-muted-foreground">Limite de Resultados</Label>
            <Select value={limiteResultados} onValueChange={setLimiteResultados}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="space-y-1.5 w-52">
              <Label className="text-xs text-muted-foreground">Loja</Label>
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Lojas</SelectItem>
                  {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo} — {l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={load} disabled={loading} className="h-9 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Apurações', value: totalApuracoes, sub: 'no período' },
          { label: 'Lojas', value: totalLojas, sub: 'com apurações' },
          { label: 'Perda Total', value: `${fmt(totalPerdaKg)} kg`, sub: 'acumulado' },
          { label: 'Média de Perda', value: `${fmt(avgPerda)}%`, sub: 'por apuração', alert: avgPerda > 15 },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.alert ? 'text-destructive' : 'text-foreground'}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Report Cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Relatórios Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReportCard
            icon={FileText}
            color="bg-blue-500"
            title="Relatório Geral de Apurações"
            description="Lista completa de todas as apurações no período com pesos, perdas, status e responsável por loja."
            onCSV={onRel1CSV}
            onPDF={onRel1PDF}
            loading={loading}
          />
          <ReportCard
            icon={Store}
            color="bg-purple-500"
            title="Ranking de Perdas por Loja"
            description="Comparativo entre todas as lojas com total de perda em kg e percentual médio — ideal para reuniões gerenciais."
            onCSV={onRel2CSV}
            onPDF={onRel2PDF}
            loading={loading}
          />
          <ReportCard
            icon={TrendingDown}
            color="bg-red-500"
            title="Ranking de Perdas por Corte"
            description="Top cortes com maior perda acumulada em kg e percentual — identifica os cortes críticos para ação imediata."
            onCSV={onRel3CSV}
            onPDF={onRel3PDF}
            loading={loading}
          />
          <ReportCard
            icon={BarChart3}
            color="bg-emerald-500"
            title="Evolução Mensal de Perdas"
            description="Tendência mês a mês das perdas no período filtrado — acompanhe a evolução e valide ações corretivas."
            onCSV={onRel4CSV}
            onPDF={onRel4PDF}
            loading={loading}
          />
          <ReportCard
            icon={FileSpreadsheet}
            color="bg-amber-500"
            title="Relatório Analítico Matricial"
            description="Visualização em matriz cruzando cortes (linhas) e lojas (colunas). O formato exato da planilha atual de Apuração de Boi no Osso."
            onPreview={() => {
              if (filtered.length === 0) toast.error('Nenhum dado encontrado no período.');
              else setPreviewOpen(true);
            }}
            onPDF={onRelMatrizPDF}
            loading={loading}
          />
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum dado encontrado para os filtros selecionados.</p>
          <p className="text-sm mt-1">Tente ajustar o período ou os filtros acima.</p>
        </div>
      )}

      {/* Dialog de Preview Matricial */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col p-6">
          <DialogHeader className="flex flex-row items-center justify-between pb-4 block">
            <div>
              <DialogTitle className="text-xl">
                APURAÇÃO AÇOUGUE {classe === 'todas' ? 'GERAL' : (TIPO_LABEL[classe] || classe).toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                PERÍODO: {format(new Date(dataIni), 'dd/MM/yyyy')} A {format(new Date(dataFim), 'dd/MM/yyyy')}
              </DialogDescription>
            </div>
          </DialogHeader>

          {matrixData && (
            <ScrollArea className="flex-1 w-full border rounded-md relative overflow-auto bg-card rounded-t-xl pb-0">
              <Table className="relative w-full text-xs">
                <TableHeader className="sticky top-0 z-20 bg-[#7eb2e0] hover:bg-[#7eb2e0]">
                  <TableRow className="hover:bg-[#7eb2e0]">
                    {matrixData.headers.map((h, i) => (
                      <TableHead key={i} className="text-black font-bold text-center border-r border-black/10 h-8 px-2 whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixData.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/50 odd:bg-slate-50/50">
                      {row.map((cell, j) => {
                        let bg = '';
                        if (j === 0 || j === 1) bg = 'bg-[#b4cde6] font-medium sticky left-0 z-10';
                        if (j === row.length - 1) bg = 'bg-[#d2ebd2] font-semibold';
                        return (
                          <TableCell key={j} className={`border-r border-black/10 py-1.5 px-2 text-center whitespace-nowrap ${bg}`}>
                            {cell}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
                {/* FOOTER fixo na base e destacado */}
                <tfoot className="sticky bottom-0 z-20 bg-[#e6a064]">
                  <TableRow className="hover:bg-[#e6a064]">
                    <TableCell colSpan={2} className="text-black font-bold text-center border-r border-black/10 py-2">
                      CARCAÇA TOTAL
                    </TableCell>
                    {matrixData.footerRow.slice(2).map((cell, i) => {
                      const isLast = i === matrixData.footerRow.slice(2).length - 1;
                      return (
                        <TableCell key={i} className={`text-black font-bold text-center border-r border-black/10 py-2 ${isLast ? 'bg-[#ffff00]' : ''}`}>
                          {cell}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </tfoot>
              </Table>
            </ScrollArea>
          )}

          <DialogFooter className="pt-4 flex justify-between sm:justify-between items-center w-full block">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar Preview</Button>
            <Button onClick={onRelMatrizPDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar PDF Igual a Tela
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
