import heroBridalImg from '../assets/images/hero_bridal_gold_1793447888987.jpg';
import necklaceRaniImg from '../assets/images/necklace_rani_haar_1793447888407.jpg';
import earringsJhumkaImg from '../assets/images/earrings_gold_jhumka_1793447889742.jpg';
import banglesChuriImg from '../assets/images/bangles_gold_churi_1793447891053.jpg';
import ringLotusImg from '../assets/images/ring_gold_lotus_1793447893539.jpg';
import pendantChainImg from '../assets/images/pendant_chain_gold_1793447895035.jpg';

const BUNDLED_ASSETS: Record<string, string> = {
  '/src/assets/images/hero_bridal_gold_1793447888987.jpg': heroBridalImg,
  '/src/assets/images/necklace_rani_haar_1793447888407.jpg': necklaceRaniImg,
  '/src/assets/images/earrings_gold_jhumka_1793447889742.jpg': earringsJhumkaImg,
  '/src/assets/images/bangles_gold_churi_1793447891053.jpg': banglesChuriImg,
  '/src/assets/images/ring_gold_lotus_1793447893539.jpg': ringLotusImg,
  '/src/assets/images/pendant_chain_gold_1793447895035.jpg': pendantChainImg,
};

export function resolveImageUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl) return necklaceRaniImg;
  if (BUNDLED_ASSETS[pathOrUrl]) {
    return BUNDLED_ASSETS[pathOrUrl];
  }
  return pathOrUrl;
}
