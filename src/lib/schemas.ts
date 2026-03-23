import { z } from 'zod';

// ─── Tipos de metodologia ────────────────────────────────────────────────
export const metodologiaEnum = z.enum(['boi_no_osso', 'nota_10', 'embalada']);

// ─── Schema: Nova Apuração ───────────────────────────────────────────────
export const novaApuracaoSchema = z.object({
  loja_id: z.string().min(1, 'Selecione a loja.'),
  data_apuracao: z.string().min(1, 'Informe a data da apuração.'),
  tipo_apuracao: metodologiaEnum,
  peso_carcaca: z.number().nonnegative('Peso da carcaça não pode ser negativo.').optional(),
  sif: z.string().optional(),
  observacoes: z.string().optional(),
});

export type NovaApuracaoFormData = z.infer<typeof novaApuracaoSchema>;

// ─── Schema: Loja ────────────────────────────────────────────────────────
export const lojaSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório.'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  cidade: z.string().min(1, 'Cidade é obrigatória.'),
  uf: z.string().length(2, 'UF deve ter exatamente 2 letras.'),
  metodologia: z
    .array(metodologiaEnum)
    .min(1, 'Selecione ao menos uma metodologia.'),
});

export type LojaFormData = z.infer<typeof lojaSchema>;
