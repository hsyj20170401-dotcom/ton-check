export const S = {
  spring: {
    label: "봄 웜톤", en: "Spring Warm",
    tagline: "화사함이 가득한, 봄날의 당신",
    desc: "따뜻하고 맑은 색감이 어울리는 타입이에요. 골드 주얼리를 했을 때 얼굴이 한층 밝아지고, 복숭아빛이나 코랄 계열의 블러셔가 피부와 자연스럽게 어우러져요.",
    tip: "쇼핑할 때 골드 주얼리와 따뜻한 아이보리 톤의 옷을 먼저 대보세요. 얼굴에 생기가 도는 걸 바로 느낄 수 있어요.",
    mood: ["활기찬", "사랑스러운", "청순한", "밝은"],
    accessory: "골드, 로즈골드",
    subs: {
      light: { label: "라이트 스프링", desc: "맑고 투명한 파스텔 웜톤이 가장 잘 어울려요" },
      bright: { label: "브라이트 스프링", desc: "선명하고 채도 높은 따뜻한 컬러가 포인트예요" },
      warm: { label: "웜 스프링", desc: "자연스러운 웜톤 컬러가 편안하게 어울려요" }
    },
    colors: [
      {hex:"#F28B82",name:"코랄 핑크"},{hex:"#FBBC04",name:"선샤인"},{hex:"#FDD663",name:"캐모마일"},
      {hex:"#F6AE99",name:"살몬"},{hex:"#A8DAB5",name:"민트 그린"},{hex:"#FFE0B2",name:"피치 크림"},
      {hex:"#FFAB91",name:"파파야"},{hex:"#81D4FA",name:"스카이"},{hex:"#CE93D8",name:"라일락 핑크"},
      {hex:"#FFE082",name:"버터"},{hex:"#FFCCBC",name:"쉘 핑크"},{hex:"#C5E1A5",name:"연두"},
    ],
    avoid: [{hex:"#263238",name:"차콜"},{hex:"#4A148C",name:"딥 퍼플"},{hex:"#1A237E",name:"딥 네이비"},{hex:"#B0BEC5",name:"쿨 그레이"}],
    gradient: "linear-gradient(135deg, #FFF3E0 0%, #FCE4EC 50%, #FFF8E1 100%)",
    accent: "#F28B82",
  },
  summer: {
    label: "여름 쿨톤", en: "Summer Cool",
    tagline: "부드러운 빛을 품은, 여름의 당신",
    desc: "차분하고 우아한 뮤트톤이 잘 어울리는 타입이에요. 실버 주얼리가 피부를 맑게 만들어주고, 로즈 계열의 립이 얼굴에 생기를 더해줘요.",
    tip: "회색빛이 살짝 섞인 파스텔 톤을 찾아보세요. 라벤더, 더스티 로즈, 소프트 블루가 당신의 매력을 가장 잘 살려줘요.",
    mood: ["우아한", "세련된", "여성스러운", "차분한"],
    accessory: "실버, 화이트골드",
    subs: {
      light: { label: "라이트 서머", desc: "밝고 부드러운 파스텔이 얼굴을 환하게 해줘요" },
      soft: { label: "소프트 서머", desc: "뮤트되고 부드러운 톤이 자연스럽게 어울려요" },
      cool: { label: "쿨 서머", desc: "시원한 블루 베이스 컬러가 청아한 느낌을 줘요" }
    },
    colors: [
      {hex:"#B39DDB",name:"라벤더"},{hex:"#F48FB1",name:"로즈 핑크"},{hex:"#90CAF9",name:"베이비 블루"},
      {hex:"#CE93D8",name:"라일락"},{hex:"#80CBC4",name:"민트"},{hex:"#EF9A9A",name:"밀키 로즈"},
      {hex:"#B0BEC5",name:"소프트 그레이"},{hex:"#A5D6A7",name:"세이지"},{hex:"#9FA8DA",name:"페리윙클"},
      {hex:"#BCAAA4",name:"모브 베이지"},{hex:"#C5CAE9",name:"라벤더 블루"},{hex:"#F8BBD0",name:"베이비 핑크"},
    ],
    avoid: [{hex:"#FF6F00",name:"비비드 오렌지"},{hex:"#F57F17",name:"머스타드"},{hex:"#33691E",name:"올리브"},{hex:"#E65100",name:"번트 오렌지"}],
    gradient: "linear-gradient(135deg, #E8EAF6 0%, #FCE4EC 50%, #E0F7FA 100%)",
    accent: "#B39DDB",
  },
  autumn: {
    label: "가을 웜톤", en: "Autumn Warm",
    tagline: "깊이 있는 매력, 가을의 당신",
    desc: "깊고 풍부한 어스톤이 잘 어울리는 타입이에요. 앤틱 골드와 브론즈 톤의 액세서리가 고급스러운 분위기를 더해주고, 테라코타 립이 자연스러워요.",
    tip: "자연에서 온 색을 떠올려보세요. 낙엽, 호박, 시나몬 — 이런 따뜻하고 깊은 색감이 당신의 피부를 가장 건강하게 만들어줘요.",
    mood: ["고급스러운", "자연스러운", "지적인", "따뜻한"],
    accessory: "앤틱 골드, 브론즈",
    subs: {
      deep: { label: "딥 오텀", desc: "무게감 있는 깊은 색상이 존재감을 살려줘요" },
      soft: { label: "소프트 오텀", desc: "자연에서 온 듯한 부드러운 어스톤이 편안해요" },
      warm: { label: "웜 오텀", desc: "따뜻하고 풍부한 색감이 풍성한 느낌을 줘요" }
    },
    colors: [
      {hex:"#A1887F",name:"모카"},{hex:"#D4A373",name:"캐러멜"},{hex:"#8D6E63",name:"초콜릿"},
      {hex:"#C0CA33",name:"올리브"},{hex:"#FF8A65",name:"테라코타"},{hex:"#BCAAA4",name:"토프"},
      {hex:"#D7CCC8",name:"웜 샌드"},{hex:"#AED581",name:"카키 그린"},{hex:"#FFB74D",name:"앰버"},
      {hex:"#795548",name:"에스프레소"},{hex:"#FFAB91",name:"코퍼"},{hex:"#A5D6A7",name:"모스"},
    ],
    avoid: [{hex:"#E91E63",name:"핫 핑크"},{hex:"#2196F3",name:"로얄 블루"},{hex:"#E040FB",name:"네온 퍼플"},{hex:"#00BCD4",name:"비비드 민트"}],
    gradient: "linear-gradient(135deg, #EFEBE9 0%, #FFF3E0 50%, #F1F8E9 100%)",
    accent: "#A1887F",
  },
  winter: {
    label: "겨울 쿨톤", en: "Winter Cool",
    tagline: "선명한 존재감, 겨울의 당신",
    desc: "뚜렷하고 선명한 색감이 잘 어울리는 타입이에요. 플래티넘이나 실버 주얼리가 쿨한 매력을 극대화하고, 블랙이나 퓨어 화이트와의 대비가 얼굴을 돋보이게 해요.",
    tip: "흐린 색보다는 확실한 색을 고르세요. 블랙, 퓨어 화이트, 보르도, 로얄 블루처럼 명확한 색이 당신의 선명한 이목구비를 살려줘요.",
    mood: ["시크한", "도시적인", "강렬한", "모던한"],
    accessory: "플래티넘, 실버",
    subs: {
      deep: { label: "딥 윈터", desc: "깊고 강렬한 다크톤이 카리스마를 더해줘요" },
      bright: { label: "브라이트 윈터", desc: "선명하고 맑은 고채도 컬러가 빛나요" },
      cool: { label: "쿨 윈터", desc: "차갑고 깨끗한 블루 베이스가 청량해요" }
    },
    colors: [
      {hex:"#D32F2F",name:"와인 레드"},{hex:"#1565C0",name:"로얄 블루"},{hex:"#4A148C",name:"딥 퍼플"},
      {hex:"#00838F",name:"틸"},{hex:"#C2185B",name:"버건디"},{hex:"#1A237E",name:"미드나잇"},
      {hex:"#6A1B9A",name:"바이올렛"},{hex:"#212121",name:"제트 블랙"},{hex:"#FAFAFA",name:"퓨어 화이트"},
      {hex:"#F06292",name:"핫 핑크"},{hex:"#42A5F5",name:"아이스 블루"},{hex:"#9E9E9E",name:"실버"},
    ],
    avoid: [{hex:"#FFCC80",name:"살구"},{hex:"#FFE0B2",name:"피치"},{hex:"#D7CCC8",name:"웜 베이지"},{hex:"#A1887F",name:"모카"}],
    gradient: "linear-gradient(135deg, #ECEFF1 0%, #E8EAF6 50%, #F3E5F5 100%)",
    accent: "#D32F2F",
  }
};
