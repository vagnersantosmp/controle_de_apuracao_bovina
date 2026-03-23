// Shared chart helpers used by both DashboardCharts and PresentationsPage

export const CHART_COLORS = ['hsl(210, 100%, 50%)', 'hsl(160, 100%, 35%)', 'hsl(40, 100%, 50%)'];
export const RANKING_COLORS = ['hsl(220, 80%, 40%)', 'hsl(160, 60%, 45%)', 'hsl(160, 60%, 60%)', 'hsl(160, 60%, 75%)', 'hsl(160, 60%, 85%)'];
export const CORTES_COLOR = 'hsl(0, 70%, 55%)';

const CLASSE_SHORT: Record<string, string> = {
  'Boi no Osso': 'Boi',
  'Açougue Nota 10': 'Nota 10',
  'Carne Embalada': 'Embalada',
};

/**
 * Label interno para barras horizontais — mostra "%  · kg" no final da barra.
 */
export const renderBarLabelHorizontal = (props: any) => {
  const { x, y, width, height, index, data } = props;
  if (!data || width < 45) return null;
  const entry = data[index];
  if (!entry) return null;
  const label = `${entry.perda?.toFixed(1)}% · ${entry.perdaKg?.toFixed(1)}kg`;
  return (
    <text
      x={x + width - 6}
      y={y + height / 2}
      textAnchor="end"
      dominantBaseline="middle"
      fill={props.textColor || "white"}
      fontSize={10}
      fontWeight={600}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
    >
      {label}
    </text>
  );
};

/**
 * Label topo para barras verticais — mostra "% e kg" em cima da barra.
 */
export const renderBarLabelVertical = (props: any) => {
  const { x, y, width, index, data } = props;
  if (!data) return null;
  const entry = data[index];
  if (!entry) return null;
  
  return (
    <g>
      <text
        x={x + width / 2}
        y={y - 14}
        textAnchor="middle"
        fill={props.textColor || "hsl(var(--foreground))"}
        fontSize={10}
        fontWeight={700}
      >
        {entry.perda?.toFixed(1)}%
      </text>
      <text
        x={x + width / 2}
        y={y - 4}
        textAnchor="middle"
        fill={props.subTextColor || "hsl(var(--muted-foreground))"}
        fontSize={9}
      >
        {entry.perdaKg?.toFixed(1)}kg
      </text>
    </g>
  );
};

/**
 * Label externo para gráfico donut — mostra nome abreviado, % e kg.
 */
export const renderDonutLabel = ({
  cx, cy, midAngle, outerRadius, name, value, perdaKg,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const lx = cx + (outerRadius + 6) * Math.cos(-midAngle * RADIAN);
  const ly = cy + (outerRadius + 6) * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? 'start' : 'end';
  const shortName = CLASSE_SHORT[name] || name;
  return (
    <g>
      <line x1={lx} y1={ly} x2={x} y2={y} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
      <text x={x} y={y - 6} textAnchor={anchor} dominantBaseline="central" fontSize={10} fontWeight={700} fill="hsl(var(--foreground))">
        {shortName} {value.toFixed(1)}%
      </text>
      <text x={x} y={y + 8} textAnchor={anchor} dominantBaseline="central" fontSize={9} fill="hsl(var(--muted-foreground))">
        {perdaKg != null ? `${perdaKg.toFixed(1)} kg` : ''}
      </text>
    </g>
  );
};
