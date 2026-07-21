import './poem.css';
import { POEM_BODY } from './poemBody';

/** The "Braver" poem page — static parchment markup (moss SVG + verse) rendered
 *  verbatim. display:contents lets the content sit directly in body's grid so the
 *  manuscript panel stays centred. No scripts (CSS animations only). */
export function Poem() {
  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: POEM_BODY }} />;
}
