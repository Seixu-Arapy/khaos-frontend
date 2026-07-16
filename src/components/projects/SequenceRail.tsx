// Trilho estilo git-graph à esquerda das tarefas de uma seção: um nó por
// tarefa encadeada, linha vertical ligando a cadeia. O layout (lanes/cores)
// vem de buildSequenceRail; cada linha da lista desenha só a sua fatia do
// trilho, então alturas variáveis de TaskRow não precisam ser medidas.
import type { RailSegment } from '../../lib/sequenceGraph';

export const LANE_WIDTH = 10;
// Centro vertical da primeira linha de texto do TaskRow (py-1.5 + text-sm).
const NODE_Y = 16;
// space-y-0.5 entre as linhas — os segmentos vazam 2px para cima/baixo para
// a linha ficar contínua através do vão.
const ROW_GAP = 2;

const LANE_COLORS = [
  'var(--color-teal-400)',
  'var(--color-copper-400)',
  'var(--color-violet-400)',
  'var(--color-sage-500)',
  'var(--color-rust-500)',
];

interface SequenceRailCellProps {
  segments: RailSegment[];
  laneCount: number;
}

export default function SequenceRailCell({
  segments,
  laneCount,
}: SequenceRailCellProps) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: laneCount * LANE_WIDTH }}
      aria-hidden
    >
      {segments.map((s) => {
        const color = LANE_COLORS[s.colorIndex % LANE_COLORS.length];
        const cx = s.lane * LANE_WIDTH + LANE_WIDTH / 2;
        return (
          <div key={s.lane}>
            {s.drawTop && (
              <div
                className="absolute w-0.5"
                style={{
                  left: cx - 1,
                  top: -ROW_GAP,
                  height: NODE_Y + ROW_GAP,
                  backgroundColor: color,
                }}
              />
            )}
            {s.drawBottom && (
              <div
                className="absolute w-0.5"
                style={{
                  left: cx - 1,
                  top: NODE_Y,
                  bottom: -ROW_GAP,
                  backgroundColor: color,
                }}
              />
            )}
            {s.node && (
              <div
                className="absolute size-[7px] rounded-full"
                style={{
                  left: cx - 3.5,
                  top: NODE_Y - 3.5,
                  backgroundColor: color,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
