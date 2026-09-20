/* Aurora 배포 페이지 테마 엔진.
   src/context/AppContext.js 의 테마 생성 로직과 팔레트 정의를 그대로 옮긴 것이다.
   페이지의 테마 전환이 실제 앱이 만들어 내는 18개 토큰 값과 정확히 같아야 하므로,
   여기서 색을 다시 고르거나 반올림하지 않는다. 앱에서 팔레트가 바뀌면 이 파일도 같이 옮긴다. */

const hexToRgb = (hex) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
};
const mixThemeColor = (from, to, amount) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return `#${a.map((value, index) => Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
};
const themeLuminance = (hex) => {
  const channels = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const themeContrast = (first, second) => {
  const light = Math.max(themeLuminance(first), themeLuminance(second));
  const dark = Math.min(themeLuminance(first), themeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
};
const ensureThemeContrast = (color, background, target) => {
  let result = color;
  const toward = themeLuminance(background) > 0.42 ? '#08090b' : '#f8f8f5';
  for (let index = 0; index < 12 && themeContrast(result, background) < target; index += 1) {
    result = mixThemeColor(result, toward, 0.18);
  }
  return result;
};
const ensureThemeContrastAcross = (color, backgrounds, target) => {
  let result = color;
  const toward = themeLuminance(backgrounds[0]) > 0.42 ? '#08090b' : '#f8f8f5';
  for (let index = 0; index < 12 && backgrounds.some((background) => themeContrast(result, background) < target); index += 1) {
    result = mixThemeColor(result, toward, 0.18);
  }
  return result;
};
const createThemeSurface = (background, color, text, amount, minimumContrast = 4.5) => {
  let blend = amount;
  let result = mixThemeColor(background, color, blend);
  while (blend > 0.08 && themeContrast(text, result) < minimumContrast) {
    blend -= 0.06;
    result = mixThemeColor(background, color, blend);
  }
  return result;
};
const createPaletteTheme = (id, name, dark, palette, accentIndex, highlightIndex) => {
  const sorted = [...palette].sort((first, second) => themeLuminance(first) - themeLuminance(second));
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];
  const background = dark ? darkest : lightest;
  const surface = dark ? sorted[1] : sorted[sorted.length - 2];
  const alternateSurface = sorted[2];
  const detailColor = dark ? sorted[3] : sorted[1];
  const textPrimary = ensureThemeContrast(dark ? lightest : darkest, background, 7);
  const accent = ensureThemeContrast(palette[accentIndex], background, 4.5);
  const highlight = palette[highlightIndex];
  const backgroundSecondary = createThemeSurface(background, surface, textPrimary, dark ? 0.78 : 0.62);
  const backgroundTertiary = createThemeSurface(background, alternateSurface, textPrimary, dark ? 0.66 : 0.5);
  const textBackgrounds = [background, backgroundSecondary, backgroundTertiary];
  const textSecondary = ensureThemeContrastAcross(mixThemeColor(textPrimary, background, 0.2), textBackgrounds, 4.5);
  const textTertiary = ensureThemeContrastAcross(mixThemeColor(textPrimary, background, 0.36), textBackgrounds, 4.5);
  const codeBackground = dark ? mixThemeColor(background, '#000000', 0.38) : darkest;
  return {
    id,
    name,
    dark,
    palette,
    colors: {
      '--bg-primary': background,
      '--bg-secondary': backgroundSecondary,
      '--bg-tertiary': backgroundTertiary,
      '--bg-hover': createThemeSurface(backgroundSecondary, highlight, textPrimary, dark ? 0.2 : 0.16),
      '--bg-active': createThemeSurface(backgroundSecondary, accent, textPrimary, dark ? 0.4 : 0.32),
      '--border': mixThemeColor(background, detailColor, dark ? 0.72 : 0.56),
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--text-tertiary': textTertiary,
      '--text-muted': ensureThemeContrastAcross(mixThemeColor(textPrimary, background, 0.52), textBackgrounds, 3.1),
      '--accent': accent,
      '--accent-bg': createThemeSurface(background, accent, accent, dark ? 0.28 : 0.2, 3.2),
      '--danger': ensureThemeContrast(dark ? '#ff7b86' : '#b93645', background, 4.5),
      '--code-bg': codeBackground,
      '--code-text': ensureThemeContrast(lightest, codeBackground, 7),
      '--highlight': createThemeSurface(background, highlight, textPrimary, dark ? 0.62 : 0.54),
      '--selection': createThemeSurface(background, detailColor, textPrimary, dark ? 0.52 : 0.46),
      '--scrollbar': mixThemeColor(background, detailColor, dark ? 0.78 : 0.64),
    },
  };
};

const LEGACY_THEMES = {
  light: { id:'light',name:'라이트',dark:false,colors:{'--bg-primary':'#ffffff','--bg-secondary':'#fafafa','--bg-tertiary':'#f3f3f3','--bg-hover':'#f0f0f0','--bg-active':'#e8f0fe','--border':'#e8e8e8','--text-primary':'#1a1a1a','--text-secondary':'#333333','--text-tertiary':'#666666','--text-muted':'#999999','--accent':'#4a9eff','--accent-bg':'#e0ecff','--danger':'#e74c3c','--code-bg':'#1e1e1e','--code-text':'#d4d4d4','--highlight':'#fff3a8','--selection':'#c2dbff','--scrollbar':'#dddddd'} },
  dark: { id:'dark',name:'다크',dark:true,colors:{'--bg-primary':'#191919','--bg-secondary':'#1f1f1f','--bg-tertiary':'#262626','--bg-hover':'#2b2b2b','--bg-active':'#3a3a3a','--border':'#333333','--text-primary':'#d8d8d8','--text-secondary':'#b7b7b7','--text-tertiary':'#939393','--text-muted':'#707070','--accent':'#6aa6f5','--accent-bg':'#2c394c','--danger':'#f06b6b','--code-bg':'#111111','--code-text':'#cbcbcb','--highlight':'#31435b','--selection':'#364a63','--scrollbar':'#3d3d3d'} },
  navy: { id:'navy',name:'남색',dark:true,colors:{'--bg-primary':'#131c33','--bg-secondary':'#18233d','--bg-tertiary':'#1f2c4a','--bg-hover':'#1d2a4d','--bg-active':'#253763','--border':'#213058','--text-primary':'#dee0e7','--text-secondary':'#b9bdca','--text-tertiary':'#9198aa','--text-muted':'#6b7388','--accent':'#f5c36b','--accent-bg':'#524b43','--danger':'#ff7a6e','--code-bg':'#0e1526','--code-text':'#d1d3da','--highlight':'#574e44','--selection':'#2c3f6b','--scrollbar':'#263967'} },
  strawberrymilk: { id:'strawberrymilk',name:'딸기우유',dark:false,colors:{'--bg-primary':'#fffafc','--bg-secondary':'#ffe9f1','--bg-tertiary':'#ffd3e3','--bg-hover':'#ffe8f1','--bg-active':'#ffd3e3','--border':'#fbb8d1','--text-primary':'#000000','--text-secondary':'#070304','--text-tertiary':'#2e1920','--text-muted':'#54313c','--accent':'#cf1a5c','--accent-bg':'#fdebf1','--danger':'#a8291d','--code-bg':'#000000','--code-text':'#fdfcfc','--highlight':'#b8f0dd','--selection':'#ffc2d8','--scrollbar':'#faa5c4'} },
  lemonsoda: { id:'lemonsoda',name:'레몬소다',dark:false,colors:{'--bg-primary':'#fffdf2','--bg-secondary':'#fbf3cf','--bg-tertiary':'#f5e79c','--bg-hover':'#fbf3cb','--bg-active':'#d6e6f5','--border':'#ecdc86','--text-primary':'#000000','--text-secondary':'#000000','--text-tertiary':'#0d0c07','--text-muted':'#34301e','--accent':'#14568c','--accent-bg':'#cbd8dc','--danger':'#c9432d','--code-bg':'#000000','--code-text':'#fbfaf6','--highlight':'#f5e79c','--selection':'#a8c8e8','--scrollbar':'#ead774'} },
  lavender: { id:'lavender',name:'라벤더',dark:false,colors:{'--bg-primary':'#fdfbff','--bg-secondary':'#f0e8fb','--bg-tertiary':'#ddcbf5','--bg-hover':'#efe5fb','--bg-active':'#ddcbf5','--border':'#cdb4ed','--text-primary':'#000000','--text-secondary':'#000000','--text-tertiary':'#17131d','--text-muted':'#342c41','--accent':'#6b3fa0','--accent-bg':'#ddd2ea','--danger':'#c0392b','--code-bg':'#000000','--code-text':'#fdfcfe','--highlight':'#b8f0dd','--selection':'#cbb4ee','--scrollbar':'#c2a4e9'} },
  tangerine: { id:'tangerine',name:'감귤',dark:false,colors:{'--bg-primary':'#fffaf3','--bg-secondary':'#ffe6cc','--bg-tertiary':'#ffcf9e','--bg-hover':'#ffe7cd','--bg-active':'#ffcf9e','--border':'#f9c086','--text-primary':'#000000','--text-secondary':'#000000','--text-tertiary':'#130d08','--text-muted':'#3d2b1c','--accent':'#0e6e73','--accent-bg':'#dce5e0','--danger':'#c0392b','--code-bg':'#000000','--code-text':'#fbf9f7','--highlight':'#cdeef0','--selection':'#ffbe80','--scrollbar':'#f8b672'} },
  mintchoco: { id:'mintchoco',name:'민트초코',dark:true,colors:{'--bg-primary':'#1e1613','--bg-secondary':'#251c18','--bg-tertiary':'#31251f','--bg-hover':'#342621','--bg-active':'#47342d','--border':'#3d2d27','--text-primary':'#dbd6d5','--text-secondary':'#bbb4b2','--text-tertiary':'#9a908c','--text-muted':'#766c69','--accent':'#4ee0b0','--accent-bg':'#2b4f3f','--danger':'#ff8080','--code-bg':'#161010','--code-text':'#cecac8','--highlight':'#2c5342','--selection':'#2a5248','--scrollbar':'#4a362f'} },
  forest: { id:'forest',name:'숲',dark:true,colors:{'--bg-primary':'#0f1c15','--bg-secondary':'#13241b','--bg-tertiary':'#1a3024','--bg-hover':'#1b3326','--bg-active':'#264735','--border':'#213d2e','--text-primary':'#d0d9d4','--text-secondary':'#adbab3','--text-tertiary':'#86998f','--text-muted':'#64756c','--accent':'#a8d84f','--accent-bg':'#3a5125','--danger':'#ff8577','--code-bg':'#0a150f','--code-text':'#c4ccc8','--highlight':'#3d5426','--selection':'#27503a','--scrollbar':'#284a38'} },
  nightsea: { id:'nightsea',name:'밤바다',dark:true,colors:{'--bg-primary':'#0b2027','--bg-secondary':'#0f2830','--bg-tertiary':'#16353f','--bg-hover':'#133743','--bg-active':'#1a4a5b','--border':'#16414f','--text-primary':'#d1dce0','--text-secondary':'#abbdc3','--text-tertiary':'#839ca4','--text-muted':'#5f7880','--accent':'#ff8a6b','--accent-bg':'#433937','--danger':'#ff5f7e','--code-bg':'#07181e','--code-text':'#c4cfd3','--highlight':'#54403b','--selection':'#1c4c58','--scrollbar':'#1b4e5f'} },
};

const PALETTE_ARGS = [
  ['mossStation', '이끼 낀 우주정거장', false, ['#DAD7CD','#A3B18A','#588157','#3A5A40','#344E41'], 2, 1],
  ['marsLunchbox', '화성 불판 야영', true, ['#D36135','#7FB069','#ECE4B7','#E6AA68','#02020B'], 3, 1],
  ['peachSubmarine', '복숭아 구름 잠수함', false, ['#FFA69E','#FAF3DD','#B8F2E6','#AED9E0','#5E6472'], 0, 2],
  ['mintComet', '민트 혜성 정거장', false, ['#BCB6FF','#B8E1FF','#A9FFF7','#94FBAB','#82ABA1'], 0, 3],
  ['neonWitch', '네온 마녀의 지하실', true, ['#F433AB','#CB04A5','#934683','#65334D','#2D1115'], 0, 2],
  ['unicornNight', '유니콘의 야간비행', false, ['#6E44FF','#B892FF','#FFC2E2','#FF90B3','#EE7A85'], 0, 2],
  ['jamLanding', '딸기잼 비상착륙', false, ['#5D2A42','#FB6376','#FCB1A6','#FFDCCC','#FFF9EC'], 1, 2],
  ['purpleRunway', '비 오는 보라 활주로', false, ['#E88D67','#BB999C','#9999C3','#7B8CDE','#C0E6DE'], 3, 0],
  ['midnightGreenhouse', '심야 온실의 도둑', true, ['#100007','#200116','#2D0605','#4C0827','#80D39B'], 4, 3],
  ['moonkenCastle', '달빛에 잠긴 성', true, ['#331832','#694D75','#1B5299','#9FC2CC','#F1ECCE'], 3, 4],
  ['violetTimeMachine', '보랏빛 시간여행', true, ['#242038','#9067C6','#8D86C9','#CAC4CE','#F7ECE1'], 1, 3],
  ['teacupPlanet', '오래된 찻잔 행성', false, ['#EFF9F0','#DDC8C4','#896A67','#6B4D57','#13070C'], 2, 1],
  ['arcticHoliday', '북극 연구원의 휴일', false, ['#1F2421','#586F7C','#B8DBD9','#F4F4F9','#04724D'], 4, 2],
  ['deepSeaGarden', '심해 정원 야근반', true, ['#1F2421','#216869','#49A078','#9CC5A1','#DCE1DE'], 2, 3],
  ['oliveGhostHotel', '올리브 유령 호텔', true, ['#5A5353','#A07178','#E6CCBE','#776274','#C8CC92'], 4, 2],
  ['pinkSignal', '핑크 신호를 잡은 밤', true, ['#1F2421','#FFDDE2','#EFD6D2','#FF8CC6','#DE369D'], 3, 2],
  ['alienLullaby', '외계 식물의 자장가', true, ['#14080E','#49475B','#799496','#ACC196','#E9EB9E'], 4, 3],
  ['westernCoffee', '서부극 속 커피머신', false, ['#A8763E','#F7F3E3','#ECF0F1','#6F1A07','#2B2118'], 3, 0],
  ['bluePostOffice', '파란 우체국의 오후', false, ['#E8E5DA','#CDC392','#9EB7E5','#648DE5','#304C89'], 4, 1],
  ['tomatoCaptain', '토마토 선장의 비밀', true, ['#D33F49','#D7C0D0','#EFF0D1','#77BA99','#262730'], 3, 0],
  ['lastJazzRobot', '재즈 바의 마지막 로봇', true, ['#2D2D2A','#4C4C47','#848FA5','#C14953','#E5DCC5'], 3, 2],
  ['dawnRadioRose', '새벽 라디오와 장미', true, ['#333333','#666A86','#95B8D1','#E8DDB5','#EDAFB8'], 4, 2],
  ['atticDetective', '장밋빛 다락방 탐정', false, ['#C78283','#F3D9DC','#D7BEA8','#B49286','#744253'], 4, 2],
  ['lemonPicnic', '레몬 피크닉 대소동', false, ['#E6EBE0','#ED6A5A','#F4F1BB','#9BC1BC','#5D576B'], 1, 2],
  ['monoLightning', '흑백 영화의 보라 번개', true, ['#000000','#FFFFFF','#808080','#6E2594','#ECD444'], 4, 3],
  ['silverRainMap', '낡은 지도와 은빛 비', true, ['#93A3B1','#7C898B','#636564','#4C443C','#322214'], 0, 1],
  ['wreckedGreenhouse', '우주 난파선의 식물원', true, ['#090C08','#474056','#757083','#8A95A5','#B9C6AE'], 4, 2],
  ['sleepingWhaleBall', '잠든 고래의 무도회', true, ['#1E3231','#485665','#8E7C93','#D0A5C0','#F6C0D0'], 3, 4],
  ['polarTealFridge', '북극곰의 청록 냉장고', false, ['#FFFFFA','#0D5C63','#44A1A0','#78CDD7','#247B7B'], 1, 3],
  ['cowboyCreamNote', '카우보이의 크림 노트', false, ['#2B2118','#AF9164','#F7F3E3','#B3B6B7','#6F1A07'], 4, 1],
  ['cloudServerAlert', '구름 서버의 빨간 경고', false, ['#E7F0FF','#E3EBFF','#4392F1','#ECE8EF','#DC493A'], 2, 4],
  ['cyberMintMidnight', '사이버 민트의 자정', true, ['#000009','#464F51','#DEFFF2','#D68FD6','#0FF4C6'], 4, 3],
  ['plumKingdom', '자두잼 왕국 회의실', false, ['#FFFFFF','#412234','#6D466B','#B49FCC','#EAD7D7'], 2, 3],
  ['violetMoonHouse', '보랏빛 달의 하숙집', true, ['#231942','#5E548E','#9F86C0','#BE95C4','#E0B1CB'], 3, 4],
  ['lavenderAgent', '비밀 요원의 라벤더 코트', true, ['#383F51','#DDDBF1','#3C4F76','#D1BEB0','#AB9F9D'], 3, 1],
];

const PALETTE_THEMES = PALETTE_ARGS.map((args) => createPaletteTheme(...args));

window.AURORA_THEMES = [LEGACY_THEMES.light, LEGACY_THEMES.dark, ...PALETTE_THEMES];
