/*
 * 店铺内容集中维护文件。
 * 收到真实价格、型号、二维码和安装条款后，优先修改这里。
 */
window.SHOP_DATA = {
  store: {
    name: "联塑管道 · 品尚装饰",
    serviceArea: "宁陵县及周边乡村",
    phones: ["15836485998", "13781449660"],
    wechatQr: ""
  },
  categories: ["全部", "热水器", "烟机灶具", "卫浴", "水电管道"],
  products: [
    {
      id: "water-heater-60l",
      category: "热水器",
      name: "60L 储水式电热水器",
      brand: "美的",
      model: "具体型号待确认",
      image: "assets/products/water-heater.png",
      price: "699元",
      priceNote: "商品和安装费用分开确认",
      description: "适合常见家庭洗浴场景，购买前需结合人数、连续使用习惯、安装位置和线路条件选型。",
      tags: ["容量 60L", "送装可咨询"],
      aliases: ["热水器", "电热水器", "洗澡", "洗浴", "储水式"],
      included: ["基础安装内容待店内确认后公开"],
      extras: ["拆除旧机", "超长水管或电线", "墙体特殊打孔", "线路或漏保整改", "超出服务范围的配送"],
      notice: "安装前应确认墙体承重、接地、漏保与线路条件。"
    },
    {
      id: "side-suction-hood",
      category: "烟机灶具",
      name: "侧吸式抽油烟机",
      brand: "美的",
      model: "具体型号待确认",
      image: "assets/products/range-hood.png",
      price: "价格待录入",
      priceNote: "可单购，也可咨询烟灶套餐",
      description: "选购前建议确认灶台宽度、烟道位置、预留电源与原有开孔尺寸。",
      tags: ["侧吸式", "烟灶可配套"],
      aliases: ["烟机", "油烟机", "抽油烟机", "抽烟机", "厨房排烟"],
      included: ["基础安装内容待店内确认后公开"],
      extras: ["拆除旧机", "扩大或新开烟道孔", "止逆阀", "加长烟管", "高空或特殊墙面施工"],
      notice: "实际排烟效果还会受到公共烟道、烟管走向和止逆阀情况影响。"
    },
    {
      id: "gas-hob",
      category: "烟机灶具",
      name: "嵌入式燃气灶",
      brand: "美的",
      model: "具体型号待确认",
      image: "assets/products/gas-hob.png",
      price: "价格待录入",
      priceNote: "购买前需核对气源与开孔尺寸",
      description: "燃气灶需要核对天然气或液化气类型、台面开孔尺寸和橱柜通风条件。",
      tags: ["嵌入式", "气源需确认"],
      aliases: ["燃气灶", "煤气灶", "灶具", "炉灶", "天然气灶", "液化气灶"],
      included: ["产品交付与基础摆放范围待确认"],
      extras: ["台面扩孔或改孔", "更换不合格配件", "超出服务范围的配送"],
      notice: "涉及燃气连接与改造时，应按照当地规定由具备相应条件的人员操作。"
    },
    {
      id: "toilet",
      category: "卫浴",
      name: "节水坐便器",
      brand: "箭牌",
      model: "具体型号待确认",
      image: "assets/products/toilet.png",
      price: "价格待录入",
      priceNote: "购买前需确认坑距与排污方式",
      description: "选购前测量墙面到排污口中心的坑距，并确认卫生间排水和空间尺寸。",
      tags: ["节水", "坑距需确认"],
      aliases: ["马桶", "坐便器", "坐厕", "厕所", "卫生间", "节水马桶"],
      included: ["基础安装内容待店内确认后公开"],
      extras: ["拆除旧坐便器", "排污口移位或整改", "角阀软管等配件", "地面修补", "超出服务范围的配送"],
      notice: "坑距不匹配可能导致无法贴墙安装，建议先拍照并测量。"
    },
    {
      id: "shower-set",
      category: "卫浴",
      name: "淋浴花洒套装",
      brand: "品牌待确认",
      model: "具体型号待确认",
      image: "assets/products/shower-set.png",
      price: "价格待录入",
      priceNote: "可咨询产品与安装组合价",
      description: "购买前建议确认冷热水口间距、安装高度、水压和原有配件情况。",
      tags: ["淋浴套装", "安装可咨询"],
      aliases: ["花洒", "淋浴", "喷头", "淋浴器", "洗澡喷头"],
      included: ["基础安装内容待店内确认后公开"],
      extras: ["拆除旧花洒", "暗管或出水口整改", "特殊墙面打孔", "额外配件", "超出服务范围的配送"],
      notice: "水压、热水设备和管路情况会影响实际使用体验。"
    },
    {
      id: "bathroom-vanity",
      category: "卫浴",
      name: "浴室柜组合",
      brand: "品牌待确认",
      model: "具体型号待确认",
      image: "assets/products/bathroom-vanity.png",
      price: "价格待录入",
      priceNote: "尺寸、镜柜和台盆配置需确认",
      description: "选购前测量墙面宽度、排水位置、插座和镜前灯位置，避免送到后无法安装。",
      tags: ["浴室柜", "尺寸需确认"],
      aliases: ["洗脸盆", "洗手盆", "台盆", "镜柜", "洗漱台", "卫生间柜"],
      included: ["基础安装内容待店内确认后公开"],
      extras: ["拆除旧柜", "墙体特殊打孔", "水路或排水改造", "角阀龙头等配件", "超出服务范围的配送"],
      notice: "潮湿环境应关注柜体材质、封边和卫生间通风情况。"
    }
  ],
  cases: []
};
