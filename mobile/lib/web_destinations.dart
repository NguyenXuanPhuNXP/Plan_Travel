// Content and photography shared with frontend/src/utils/ and frontend/public/images/.
typedef TravelDestination = ({
  String name,
  String area,
  String image,
  String type,
});

const webDestinations = <TravelDestination>[
  (
    name: "Đà Nẵng",
    area: 'Việt Nam',
    image: "assets/da-nang.jpg",
    type: "Biển đảo",
  ),
  (
    name: "Đà Lạt",
    area: 'Việt Nam',
    image: "assets/da-lat.jpg",
    type: "Thiên nhiên",
  ),
  (
    name: "Phú Quốc",
    area: 'Việt Nam',
    image: "assets/phu-quoc.jpg",
    type: "Biển đảo",
  ),
  (
    name: "Hội An",
    area: 'Việt Nam',
    image: "assets/hoi-an.jpg",
    type: "Văn hóa",
  ),
  (
    name: "Sa Pa",
    area: 'Việt Nam',
    image: "assets/sa-pa.jpg",
    type: "Núi rừng",
  ),
  (
    name: "Nha Trang",
    area: 'Việt Nam',
    image: "assets/nha-trang.jpg",
    type: "Biển đảo",
  ),
  (name: "Huế", area: 'Việt Nam', image: "assets/hue.jpg", type: "Văn hóa"),
  (
    name: "Hạ Long",
    area: 'Việt Nam',
    image: "assets/ha-long.jpg",
    type: "Thiên nhiên",
  ),
  (
    name: "Vũng Tàu",
    area: 'Việt Nam',
    image: "assets/vung-tau.jpg",
    type: "Biển đảo",
  ),
  (
    name: "Quy Nhơn",
    area: 'Việt Nam',
    image: "assets/quy-nhon.jpg",
    type: "Biển đảo",
  ),
];

const webDestinationDetails =
    <
      String,
      ({String description, String source, List<(String, String)> places})
    >{
      "Đà Nẵng": (
        description: "Thành phố đáng sống bên bờ biển miền Trung, nổi tiếng với Cầu Vàng và ẩm thực phong phú.",
        source: "https://vietnam.travel/things-to-do/must-do-da-nang-an-insider-list/",
        places: [
          ("Ngũ Hành Sơn", "Khám phá núi đá, hang động và các ngôi chùa."),
          (
            "Cầu Vàng - Bà Nà Hills",
            "Ngắm cây cầu nổi tiếng giữa cảnh quan núi Bà Nà.",
          ),
          (
            "Bãi biển Mỹ Khê",
            "Dành thời gian dạo biển và thư giãn bên bờ cát.",
          ),
          (
            "Chùa Linh Ứng Sơn Trà",
            "Ghé bán đảo Sơn Trà và ngắm thành phố từ phía biển.",
          ),
        ],
      ),
      "Đà Lạt": (
        description: "Thành phố ngàn hoa với khí hậu mát mẻ quanh năm, thiên đường cho nghỉ dưỡng và chụp ảnh.",
        source: "https://vietnam.travel/things-to-do/top-things-do-central-vietnam/",
        places: [
          ("Hồ Xuân Hương", "Đi bộ và cảm nhận nhịp sống trung tâm thành phố."),
          ("Ga Đà Lạt", "Ghé công trình kiến trúc đường sắt đặc trưng."),
          ("Chùa Linh Phước", "Ngắm kiến trúc khảm sành sứ tại Trại Mát."),
          (
            "Dinh Bảo Đại",
            "Tìm hiểu dấu ấn lịch sử giữa thành phố cao nguyên.",
          ),
        ],
      ),
      "Phú Quốc": (
        description: "Đảo ngọc phương Nam với bãi biển cát trắng tuyệt đẹp và hải sản tươi sống.",
        source: "https://vietnam.travel/things-to-do/explore-phu-quoc-island-3-days-2-nights/",
        places: [
          ("Bãi Sao", "Một điểm nghỉ chân bên bờ cát ở phía nam đảo."),
          (
            "Chợ đêm Phú Quốc",
            "Khám phá không khí buổi tối và các món địa phương.",
          ),
          ("Nhà tù Phú Quốc", "Tìm hiểu một phần lịch sử của đảo."),
          ("Dinh Cậu", "Ghé điểm đến văn hóa ven biển tại Dương Đông."),
        ],
      ),
      "Hội An": (
        description: "Phố cổ di sản UNESCO với đèn lồng rực rỡ, ẩm thực đường phố và làng nghề truyền thống.",
        source: "https://danangfantasticity.com/en/see-and-do/japanese-covered-bridge-chua-cau",
        places: [
          ("Chùa Cầu", "Biểu tượng kiến trúc trong lòng phố cổ Hội An."),
          ("Nhà cổ Tấn Ký", "Khám phá không gian nhà buôn truyền thống."),
          (
            "Hội quán Phúc Kiến",
            "Tìm hiểu di sản văn hóa và kiến trúc hội quán.",
          ),
          ("Làng rau Trà Quế", "Đi chậm lại giữa những khu vườn và làng quê."),
        ],
      ),
      "Sa Pa": (
        description: "Vùng núi Tây Bắc hùng vĩ với ruộng bậc thang, bản làng dân tộc và đỉnh Fansipan.",
        source: "https://vietnam.travel/place-to-go/northern-midlands-mountains/sapa/",
        places: [
          ('Đỉnh Fansipan', 'Ngắm cảnh núi cao và dãy Hoàng Liên Sơn.'),
          ('Bản Cát Cát', 'Khám phá cảnh quan và văn hóa bản làng.'),
          (
            'Thung lũng Mường Hoa',
            'Theo những cung đường giữa ruộng bậc thang.',
          ),
          (
            'Nhà thờ đá Sa Pa',
            'Một điểm hẹn quen thuộc tại trung tâm thị trấn.',
          ),
        ],
      ),
      "Nha Trang": (
        description: "Thành phố biển sôi động với vịnh đẹp nhất thế giới, lặn biển và đời sống về đêm.",
        source: "https://vietnam.travel/place-to-go/south-central-coast-central-highlands/nha-trang/",
        places: [
          ("Tháp Bà Ponagar", "Ghé quần thể tháp gắn với di sản văn hóa Chăm."),
          ("Chùa Long Sơn", "Một điểm tham quan văn hóa trong thành phố."),
          ("Hòn Mun", "Khám phá cảnh quan biển đảo của vịnh Nha Trang."),
          ("Bãi biển Trần Phú", "Dạo biển trên trục đường ven vịnh."),
        ],
      ),
      "Huế": (
        description: "Cố đô triều Nguyễn với kiến trúc cung đình, ẩm thực cung đình và dòng sông Hương thơ mộng.",
        source: "https://whc.unesco.org/en/list/678/maps/",
        places: [
          ("Đại Nội Huế", "Khám phá Hoàng thành và không gian cung đình."),
          ("Chùa Thiên Mụ", "Một điểm dừng bên dòng sông Hương."),
          ("Lăng Tự Đức", "Dạo trong quần thể lăng giữa cây xanh và hồ nước."),
          (
            "Lăng Minh Mạng",
            "Tìm hiểu kiến trúc lăng tẩm giữa cảnh quan đồi hồ.",
          ),
        ],
      ),
      "Hạ Long": (
        description: "Di sản thiên nhiên UNESCO với hàng ngàn hòn đảo đá vôi, du thuyền và hang động kỳ bí.",
        source:
            "https://vietnam.travel/things-to-do/what-to-do-in-ha-long-bay/",
        places: [
          ("Hang Sửng Sốt", "Một trong những hang động nổi tiếng của vịnh."),
          ("Đảo Ti Tốp", "Ghé bãi biển và điểm ngắm cảnh trên đảo."),
          ("Hang Luồn", "Trải nghiệm cảnh quan hang nước trên vịnh."),
          ("Động Thiên Cung", "Khám phá không gian nhũ đá trong lòng đảo."),
        ],
      ),
      "Vũng Tàu": (
        description: "Thành phố biển gần Sài Gòn, lý tưởng cho chuyến đi cuối tuần với hải sản tươi ngon.",
        source: "https://vietnam.travel/things-to-do/essential-vung-tau-guide/",
        places: [
          ("Hải đăng Vũng Tàu", "Ngắm cảnh thành phố từ Núi Nhỏ."),
          ("Tượng Chúa Kitô Vua", "Ghé điểm tham quan nổi bật trên núi."),
          ("Bãi Sau", "Thư giãn và đi dạo bên bờ biển."),
          ("Bạch Dinh", "Khám phá dấu ấn kiến trúc và lịch sử."),
        ],
      ),
      "Quy Nhơn": (
        description: "Viên ngọc ẩn của miền Trung với bãi biển hoang sơ, cảnh quan thiên nhiên tuyệt đẹp.",
        source: "https://govietnam.travel/destination/ky-co-eo-gio-nhon-ly-hon-kho-coastal-cluster/",
        places: [
          ("Kỳ Co", "Ghé bãi biển giữa cảnh quan ven bán đảo."),
          ("Eo Gió", "Dạo đường ven biển và ngắm các vách đá."),
          ("Hòn Khô", "Tìm hiểu nhịp sống và cảnh quan biển đảo."),
          ("Tháp Đôi", "Khám phá dấu ấn kiến trúc Chăm trong thành phố."),
        ],
      ),
    };

String normalizeDestination(String value) {
  var result = value.toLowerCase().trim();
  const groups = {
    "a": "àáạảãâầấậẩẫăằắặẳẵ",
    "e": "èéẹẻẽêềếệểễ",
    "i": "ìíịỉĩ",
    "o": "òóọỏõôồốộổỗơờớợởỡ",
    "u": "ùúụủũưừứựửữ",
    "y": "ỳýỵỷỹ",
    "d": "đ",
  };
  for (final entry in groups.entries) {
    result = result.replaceAll(RegExp("[${entry.value}]"), entry.key);
  }
  return result.replaceAll('sa pa', 'sapa');
}
