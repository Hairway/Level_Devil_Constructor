const svgData = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const INK = '#070707';
const FRAME = '#b87211';
const DOOR = '#cfcfcf';
const CONTROL = '#ffd07a';
const CONTROL_FILL = '#f2b14c';

export const heroIdle = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <rect x="6" y="2" width="5" height="14" fill="${INK}"/>
  <rect x="4" y="5" width="4" height="11" fill="${INK}"/>
</svg>`);

export const heroRun1 = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <rect x="6" y="2" width="5" height="11" fill="${INK}"/>
  <rect x="4" y="5" width="4" height="8" fill="${INK}"/>
  <rect x="4" y="13" width="3" height="3" fill="${INK}"/>
  <rect x="10" y="13" width="2" height="3" fill="${INK}"/>
</svg>`);

export const heroRun2 = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <rect x="6" y="2" width="5" height="12" fill="${INK}"/>
  <rect x="4" y="5" width="4" height="9" fill="${INK}"/>
  <rect x="6" y="14" width="2" height="2" fill="${INK}"/>
  <rect x="11" y="12" width="2" height="4" fill="${INK}"/>
</svg>`);

export const heroRun3 = heroRun1;
export const heroRun4 = heroRun2;

export const heroJump = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <rect x="6" y="1" width="5" height="12" fill="${INK}"/>
  <rect x="4" y="4" width="4" height="9" fill="${INK}"/>
  <rect x="5" y="13" width="2" height="2" fill="${INK}"/>
  <rect x="10" y="13" width="2" height="2" fill="${INK}"/>
</svg>`);

export const doorSafe = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <rect x="1" y="1" width="14" height="15" fill="${FRAME}"/>
  <rect x="3" y="3" width="10" height="13" fill="${DOOR}"/>
</svg>`);

export const doorKiller = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="23" viewBox="0 0 20 23" shape-rendering="crispEdges">
  <rect x="1" y="1" width="18" height="22" fill="${FRAME}"/>
  <rect x="4" y="4" width="12" height="19" fill="${DOOR}"/>
</svg>`);

export const spike = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <polygon points="0,16 4,7 8,16" fill="${INK}"/>
  <polygon points="5,16 9,5 13,16" fill="${INK}"/>
  <polygon points="10,16 14,8 16,16" fill="${INK}"/>
</svg>`);

export const btnLeftHollow = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 64" shape-rendering="crispEdges">
  <path d="M16 32 L28 7 H146 V57 H28 Z" fill="none" stroke="${CONTROL}" stroke-width="5"/>
</svg>`);

export const btnLeftFilled = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 64" shape-rendering="crispEdges">
  <path d="M16 32 L28 7 H146 V57 H28 Z" fill="${CONTROL_FILL}" stroke="${CONTROL}" stroke-width="5"/>
</svg>`);

export const btnRightHollow = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 64" shape-rendering="crispEdges">
  <path d="M134 32 L122 7 H4 V57 H122 Z" fill="none" stroke="${CONTROL}" stroke-width="5"/>
</svg>`);

export const btnRightFilled = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 64" shape-rendering="crispEdges">
  <path d="M134 32 L122 7 H4 V57 H122 Z" fill="${CONTROL_FILL}" stroke="${CONTROL}" stroke-width="5"/>
</svg>`);

export const btnJumpHollow = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 64" shape-rendering="crispEdges">
  <path d="M8 56 V34 L75 8 L142 34 V56 Z" fill="none" stroke="${CONTROL}" stroke-width="5"/>
</svg>`);

export const btnJumpFilled = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 64" shape-rendering="crispEdges">
  <path d="M8 56 V34 L75 8 L142 34 V56 Z" fill="${CONTROL_FILL}" stroke="${CONTROL}" stroke-width="5"/>
</svg>`);

export const btnSkip = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 72" shape-rendering="crispEdges">
  <rect x="0" y="0" width="240" height="60" fill="#ffc164"/>
  <rect x="0" y="60" width="240" height="12" fill="#b37111"/>
  <text x="120" y="38" text-anchor="middle" font-family="monospace" font-size="24" font-weight="900" fill="#2a1205">SKIP LEVEL</text>
</svg>`);
