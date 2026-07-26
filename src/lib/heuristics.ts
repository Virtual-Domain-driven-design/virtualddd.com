/** The three heuristic types — one definition, used everywhere.
 *
 * This was previously copied into five files and had already drifted into three
 * different descriptions of "value-based". The wording here follows the live
 * site. The images are the Kandinsky-style backgrounds used on the type tiles.
 */
import heurDesign from '../assets/heur-design.jpg';
import heurGuiding from '../assets/heur-guiding.jpg';
import heurValue from '../assets/heur-value.jpg';

type HeuristicType = 'design-heuristics' | 'guiding-heuristics' | 'value-based-heuristics';

/** The chip colour each type wears, wherever it is labelled. */
export const chipTone = (type: HeuristicType | string | undefined): string =>
  type === 'guiding-heuristics' ? 'chip--accent'
  : type === 'value-based-heuristics' ? 'chip--value'
  : 'chip--primary';

export interface HeuristicTypeInfo {
  key: HeuristicType;
  /** Full name, as a heading. */
  title: string;
  /** Short name, for the badge on a card. */
  label: string;
  text: string;
  bg: ImageMetadata;
}

export const HEURISTIC_TYPES: HeuristicTypeInfo[] = [
  {
    key: 'design-heuristics',
    title: 'Design heuristics',
    label: 'Design',
    text: 'Heuristics we use to solve a specific problem.',
    bg: heurDesign,
  },
  {
    key: 'guiding-heuristics',
    title: 'Guiding heuristics',
    label: 'Guiding',
    text: 'Heuristics that guide our use of other heuristics — meta-heuristics, if you will.',
    bg: heurGuiding,
  },
  {
    key: 'value-based-heuristics',
    title: 'Value-based heuristics',
    label: 'Value-based',
    text: 'Heuristics that shape our attitude and behaviour towards design, or the world and the way we work.',
    bg: heurValue,
  },
];

export const heuristicType = (key?: string): HeuristicTypeInfo | undefined =>
  HEURISTIC_TYPES.find((t) => t.key === key);
