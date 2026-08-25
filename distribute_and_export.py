import json
import os
import re

raw_groups = [
  {
    "stt": 1,
    "name": "Hội thiết kế website (anhkhoamedia)",
    "url": "https://www.facebook.com/groups/anhkhoamedia/"
  },
  {
    "stt": 2,
    "name": "Cộng Đồng Tư Vấn Thiết Kế Website",
    "url": "https://www.facebook.com/groups/3299853076839011/"
  },
  {
    "stt": 3,
    "name": "Hội Thiết kế Website Uy Tín",
    "url": "https://www.facebook.com/groups/thietkewebuytin/"
  },
  {
    "stt": 4,
    "name": "Hội thiết kế website và SEO web Online (Đồng Nai)",
    "url": "https://www.facebook.com/groups/488872788230714/"
  },
  {
    "stt": 5,
    "name": "Thiết Kế Website - Seo Web Lên Top Tìm kiếm",
    "url": "https://www.facebook.com/groups/thietkewebsiteseoweblentop/"
  },
  {
    "stt": 6,
    "name": "Thiết kế website và Marketing online",
    "url": "https://www.facebook.com/groups/2444908908865200/"
  },
  {
    "stt": 7,
    "name": "Hội thiết kế website uy tín giá rẻ",
    "url": "https://www.facebook.com/groups/hoithietkewebgiare/"
  },
  {
    "stt": 8,
    "name": "Hội thiết kế website bán hàng và SEO Web - Marketing Online",
    "url": "https://www.facebook.com/groups/825337241292358/"
  },
  {
    "stt": 9,
    "name": "Hội Thiết Kế Website Giá Rẻ",
    "url": "https://www.facebook.com/groups/689347191797584/"
  },
  {
    "stt": 10,
    "name": "Cộng Đồng Thiết Kế Website & SEO TOP Việt Nam ✅",
    "url": "https://www.facebook.com/groups/thietkewebseotop/"
  },
  {
    "stt": 11,
    "name": "NHÓM SỈ ĐỒ CHƠI HOTTREND TOÀN QUỐC",
    "url": "https://www.facebook.com/groups/597070329439249/"
  },
  {
    "stt": 12,
    "name": "Thiết kế Website và Marketing Online",
    "url": "https://www.facebook.com/groups/webvocuc/"
  },
  {
    "stt": 13,
    "name": "Cộng Đồng Thiết Kế Website, Landing Page, App, SEO(Coder, IT, Freelancer)❤️",
    "url": "https://www.facebook.com/groups/735053522020145/"
  },
  {
    "stt": 14,
    "name": "Web Developer In USA",
    "url": "https://www.facebook.com/groups/webdeveloperinusa/"
  },
  {
    "stt": 15,
    "name": "Thiết kế Web App & Marketing Online❤️",
    "url": "https://www.facebook.com/groups/1454215575443329/"
  },
  {
    "stt": 16,
    "name": "I Need A Website Designer / Web Developer",
    "url": "https://www.facebook.com/groups/1581116555860881/"
  },
  {
    "stt": 17,
    "name": "Website giá rẻ",
    "url": "https://www.facebook.com/groups/lamwebchuyennghiep/"
  },
  {
    "stt": 18,
    "name": "Web Design and Development",
    "url": "https://www.facebook.com/groups/modern.web.design.development/"
  },
  {
    "stt": 19,
    "name": "HỘI THIẾT KẾ WEBSITE VÀ SEO WEB ONLINE",
    "url": "https://www.facebook.com/groups/385316135316784/"
  },
  {
    "stt": 20,
    "name": "THIẾT KẾ WEBSITE",
    "url": "https://www.facebook.com/groups/1641470522807203/"
  },
  {
    "stt": 21,
    "name": "Hội thiết kế website - phần mềm bán hàng và Marketing online",
    "url": "https://www.facebook.com/groups/hoithietkewebsitevietnam/"
  },
  {
    "stt": 22,
    "name": "Website Design & Development | Mobile App & Software Development",
    "url": "https://www.facebook.com/groups/4284210398312538/"
  },
  {
    "stt": 23,
    "name": "Hỗ Trợ Đồ Án CNTT – Web – App – AI",
    "url": "https://www.facebook.com/groups/826392100466750/"
  },
  {
    "stt": 24,
    "name": "Thiết Kế Web - Thiết Kế Website Bán Hàng Chuẩn Seo❤️",
    "url": "https://www.facebook.com/groups/249683428161324/"
  },
  {
    "stt": 25,
    "name": "Hội Thiết kế Website Việt Nam 🇻🇳",
    "url": "https://www.facebook.com/groups/thietkewebsite.banhang24h/"
  },
  {
    "stt": 26,
    "name": "Thiết Kế Web Bằng Trí Tuệ A.I - Seo Website - Thiết Kế Website Chuẩn Seo",
    "url": "https://www.facebook.com/groups/1712169349298592/"
  },
  {
    "stt": 27,
    "name": "Hỗ Trợ Đồ Án CNTT & Phát Triển Web – Android – iOS – AI",
    "url": "https://www.facebook.com/groups/1969740540418079/"
  },
  {
    "stt": 28,
    "name": "Cộng Đồng Thiết Kế Website chuẩn UI/UX",
    "url": "https://www.facebook.com/groups/thietkewebsitechuanuiux/"
  },
  {
    "stt": 29,
    "name": "Cộng đồng Marketing, SEO, thiết kế Website & ứng dụng AI cho Doanh Nghiệp",
    "url": "https://www.facebook.com/groups/991117410302439/"
  },
  {
    "stt": 30,
    "name": "Lập Trình Web App Game Theo Yêu Cầu",
    "url": "https://www.facebook.com/groups/1104882584238051/"
  },
  {
    "stt": 31,
    "name": "thiết kế website",
    "url": "https://www.facebook.com/groups/691871869655045/"
  },
  {
    "stt": 32,
    "name": "Code Tools MMO, Web, App theo yêu cầu",
    "url": "https://www.facebook.com/groups/1372493020530375/"
  },
  {
    "stt": 33,
    "name": "Web Design and Development",
    "url": "https://www.facebook.com/groups/2045714238815121/"
  },
  {
    "stt": 34,
    "name": "Cộng Đồng Thiết Kế Website, Thiết Kế Phần Mềm ITGREEN.VN",
    "url": "https://www.facebook.com/groups/thietkewebphanmem/"
  },
  {
    "stt": 35,
    "name": "Code Tool, Web, App Theo Yêu Cầu",
    "url": "https://www.facebook.com/groups/codetooltheoyc/"
  },
  {
    "stt": 36,
    "name": "I need a web developer/designer",
    "url": "https://www.facebook.com/groups/629437286313102/"
  },
  {
    "stt": 37,
    "name": "Hội thiết kế website - SEO web Online - Thuê VPS",
    "url": "https://www.facebook.com/groups/100197813083056/"
  },
  {
    "stt": 38,
    "name": "Cộng Đồng Designer và website Branding #dcgr",
    "url": "https://www.facebook.com/groups/stywin/"
  },
  {
    "stt": 39,
    "name": "Hội nhóm thiết kế Website và Marketing Online",
    "url": "https://www.facebook.com/groups/thietkewebsite.mko/"
  },
  {
    "stt": 40,
    "name": "Nhóm thiết kế website, app, phần mềm nội bộ, AI, toàn bộ vấn đề công nghệ",
    "url": "https://www.facebook.com/groups/1798925620987543/"
  },
  {
    "stt": 41,
    "name": "Hội thiết kế lập trình Website - App Mobile và SEO Website Online",
    "url": "https://www.facebook.com/groups/website.seo.a/"
  },
  {
    "stt": 42,
    "name": "Hội thiết kế website và SEO web Online",
    "url": "https://www.facebook.com/groups/chothemeviet/"
  },
  {
    "stt": 43,
    "name": "Cộng Đồng Thiết Kế Website Và SEO",
    "url": "https://www.facebook.com/groups/pcrender/"
  },
  {
    "stt": 44,
    "name": "Hội lập trình - thiết kế website - SEO marketing online",
    "url": "https://www.facebook.com/groups/691510415077961/"
  },
  {
    "stt": 45,
    "name": "Thiết kế Website - SEO chuyên nghiệp",
    "url": "https://www.facebook.com/groups/seowebsitebanhang/"
  },
  {
    "stt": 46,
    "name": "Thiết Kế Website Uy Tín Giá Rẻ ✅️✅️✅ .",
    "url": "https://www.facebook.com/groups/305843301028756/"
  },
  {
    "stt": 47,
    "name": "Thiết kế website giá rẻ",
    "url": "https://www.facebook.com/groups/websitegiare/"
  },
  {
    "stt": 48,
    "name": "Code tool auto, phần mềm, website, app theo yêu cầu",
    "url": "https://www.facebook.com/groups/codetoolwebappuytin/"
  },
  {
    "stt": 49,
    "name": "CỘNG ĐỒNG CHỢ SỈ, LẺ ĐỒ CHƠI TRẺ EM TOÀN QUỐC.",
    "url": "https://www.facebook.com/groups/180941282716163/"
  },
  {
    "stt": 50,
    "name": "CHỢ BUÔN SỈ ĐỒ CHƠI TRẺ EM HOT TREND",
    "url": "https://www.facebook.com/groups/3091446454493075/"
  },
  {
    "stt": 51,
    "name": "Chợ Đồ chơi sự kiện, Teambuilding - đồ chơi bơm hơi toàn quốc",
    "url": "https://www.facebook.com/groups/1311870899336114/"
  },
  {
    "stt": 52,
    "name": "sỉ lẻ đồ chơi hottrend, đồ chơi cổng trường",
    "url": "https://www.facebook.com/groups/3434711083524198/"
  },
  {
    "stt": 53,
    "name": "HỘI BUÔN BÁN ĐỒ CHƠI TRẺ EM",
    "url": "https://www.facebook.com/groups/chosidochoitreem/"
  },
  {
    "stt": 54,
    "name": "ĐỒ CHƠI TRẺ EM TOÀN QUỐC",
    "url": "https://www.facebook.com/groups/318693079600236/"
  },
  {
    "stt": 55,
    "name": "Hội Thanh Lý Đồ Chơi Bé",
    "url": "https://www.facebook.com/groups/4574964869396171/"
  },
  {
    "stt": 56,
    "name": "THANH LÝ ĐỒ CHƠI TRẺ EM",
    "url": "https://www.facebook.com/groups/1027538900596842/"
  },
  {
    "stt": 57,
    "name": "ĐỒ CHƠI THÔNG MINH - ĐỒ CHƠI GỖ CHO TRẺ EM- CHỢ SỈ✅️",
    "url": "https://www.facebook.com/groups/743024676758804/"
  },
  {
    "stt": 58,
    "name": "THANH LÍ ĐỒ CHƠI CÁC LOẠI TOÀN QUỐC",
    "url": "https://www.facebook.com/groups/9682225975124788/"
  },
  {
    "stt": 59,
    "name": "Đồ Chơi Si , Đồ Chơi Thanh Lý Giá Rẻ",
    "url": "https://www.facebook.com/groups/1350600556748443/"
  },
  {
    "stt": 60,
    "name": "Chợ Buôn Sỉ Đồ Chơi Trẻ Em Giá Rẻ",
    "url": "https://www.facebook.com/groups/360178432856005/"
  },
  {
    "stt": 61,
    "name": "Nhóm chuyên mua bán đồ chơi si, đồ chơi trẻ em",
    "url": "https://www.facebook.com/groups/265725389938349/"
  },
  {
    "stt": 62,
    "name": "Đồ chơi si 2",
    "url": "https://www.facebook.com/groups/2368555400136295/"
  },
  {
    "stt": 63,
    "name": "QUẦN ÁO HỌC SINH GIÁ RẺ✅",
    "url": "https://www.facebook.com/groups/229815918322595/"
  },
  {
    "stt": 64,
    "name": "Quần áo giá rẻ học sinh",
    "url": "https://www.facebook.com/groups/827402014637725/"
  },
  {
    "stt": 65,
    "name": "CHỢ ĐỔ SỈ GIÀY DÉP TOÀN QUỐC  ",
    "url": "https://www.facebook.com/groups/997871751253299/"
  },
  {
    "stt": 66,
    "name": "chợ sỉ giày dép giá rẻ 15 k HCM",
    "url": "https://www.facebook.com/groups/347741961388077/"
  },
  {
    "stt": 67,
    "name": "Chợ Sỉ Giày Dép Toàn Quốc",
    "url": "https://www.facebook.com/groups/945984589363438/"
  },
  {
    "stt": 68,
    "name": "Chợ sỉ giày dép giá rẻ 15K HCM",
    "url": "https://www.facebook.com/groups/131147035763053/"
  },
  {
    "stt": 69,
    "name": "CHỢ SỈ GIÀY DÉP MIỀN BẮC",
    "url": "https://www.facebook.com/groups/335397585145043/"
  },
  {
    "stt": 70,
    "name": "SÁCH CŨ & MỚI",
    "url": "https://www.facebook.com/groups/1632894360290123/"
  },
  {
    "stt": 71,
    "name": "Đọc Sách Hay Mỗi Ngày",
    "url": "https://www.facebook.com/groups/239461704746850/"
  },
  {
    "stt": 72,
    "name": "Mua - Bán Trao Đổi Sách Cũ (BD)",
    "url": "https://www.facebook.com/groups/1041569821170294/"
  },
  {
    "stt": 73,
    "name": "Mua bán sách truyện cũ mới giá tốt",
    "url": "https://www.facebook.com/groups/1504174629818016/"
  },
  {
    "stt": 74,
    "name": "Pass sách ôn thi",
    "url": "https://www.facebook.com/groups/532441414536938/"
  },
  {
    "stt": 75,
    "name": "HỘI SÁCH REAL VIỆT",
    "url": "https://www.facebook.com/groups/761975642048216/"
  },
  {
    "stt": 76,
    "name": "pass sách- trao đổi sách và tài liệu",
    "url": "https://www.facebook.com/groups/2880664872229438/"
  },
  {
    "stt": 77,
    "name": "TỔNG KHO BÁN BUÔN ĐỒ GIA DỤNG",
    "url": "https://www.facebook.com/groups/1678624276242689/"
  },
  {
    "stt": 78,
    "name": "Hội mua bán, trao đổi đồ gia dụng, đồ dùng",
    "url": "https://www.facebook.com/groups/1325790083063693/"
  },
  {
    "stt": 79,
    "name": "Đồ Gia Dụng Giá Rẻ",
    "url": "https://www.facebook.com/groups/3866134317035659/"
  },
  {
    "stt": 80,
    "name": "ĐỒ GIA DỤNG SIÊU RẺ",
    "url": "https://www.facebook.com/groups/235552622331264/"
  },
  {
    "stt": 81,
    "name": "Hỗ trợ tiểu luận, khóa luận, báo cáo, chuyên đề, luận văn chuyên nghiệp",
    "url": "https://www.facebook.com/groups/608772771890316/"
  },
  {
    "stt": 82,
    "name": "Nhóm hỗ trợ làm Luận án - Đồ án CNTT, Web, App, AI, Data, các môn CNTT",
    "url": "https://www.facebook.com/groups/2376388242553020/"
  },
  {
    "stt": 83,
    "name": "Code thuê đồ án Công Nghệ Thông Tin - Hỗ trợ đồ án CNTT Web App AI Data",
    "url": "https://www.facebook.com/groups/1020536410537629/"
  },
  {
    "stt": 84,
    "name": "Code Đồ Án Công Nghệ Thông Tin & Lập trình Web, App [IT]",
    "url": "https://www.facebook.com/groups/10030350697082786/"
  },
  {
    "stt": 85,
    "name": "HỖ TRỢ LẬP TRÌNH - CODE THEO YÊU CẦU",
    "url": "https://www.facebook.com/groups/1163787441488087/"
  },
  {
    "stt": 86,
    "name": "CỘNG ĐỒNG THIẾT KẾ WEBSITE - CODE MMO UY TÍN",
    "url": "https://www.facebook.com/groups/362900488947380/"
  },
  {
    "stt": 87,
    "name": "Thiết Kế Website",
    "url": "https://www.facebook.com/groups/606643771643699/"
  },
  {
    "stt": 88,
    "name": "Thiết Kế Website",
    "url": "https://www.facebook.com/groups/thietkewebsitechuanseo2024/"
  },
  {
    "stt": 89,
    "name": "Cộng đồng thiết kế website chuẩn SEO uy tín giá rẻ",
    "url": "https://www.facebook.com/groups/congdongwebsitegiare/"
  },
  {
    "stt": 90,
    "name": "Cộng Đồng Thiết Kế Website & SEO Thực Chiến",
    "url": "https://www.facebook.com/groups/293243112049270/"
  },
  {
    "stt": 91,
    "name": "HỘI THIẾT KẾ WEBSITE, LANDING PAGE GIÁ RẺ",
    "url": "https://www.facebook.com/groups/tkwebsitelandingpage/"
  },
  {
    "stt": 92,
    "name": "XƯỞNG ÁO BÓNG ĐÁ, ĐỒ THỂ THAO",
    "url": "https://www.facebook.com/groups/392103491855600/"
  },
  {
    "stt": 93,
    "name": "HỘI BÁN BUÔN VĂN PHÒNG PHẨM GIÁ GỐC",
    "url": "https://www.facebook.com/groups/hoibanbuonvanphongphamgiagoc/"
  },
  {
    "stt": 94,
    "name": "Hội Cung Cấp Thực Phẩm Cho Nhà Hàng - Khách Sạn - Quán Ăn",
    "url": "https://www.facebook.com/groups/hoicungcapthucpham/"
  },
  {
    "stt": 95,
    "name": "Chợ Buôn Sỉ Đồ Chơi Trẻ Em Giá Rẻ",
    "url": "https://www.facebook.com/groups/1733366263578696/"
  },
  {
    "stt": 96,
    "name": "Vựa Đồ Cũ Mới Các Loại-Đồ Điện Tử Công Nghệ",
    "url": "https://www.facebook.com/groups/284967539238620/"
  },
  {
    "stt": 97,
    "name": "Đồ gia dụng tiện ích thông minh",
    "url": "https://www.facebook.com/groups/1178853485482983/"
  },
  {
    "stt": 98,
    "name": "Thanh Lý Đồ Bếp Công Nghiệp - Toàn Quốc",
    "url": "https://www.facebook.com/groups/1273035490522413/"
  },
  {
    "stt": 99,
    "name": "Pass đồ make - Bán đồ make chính hãng 👜💄",
    "url": "https://www.facebook.com/groups/1601824400531033/"
  },
  {
    "stt": 100,
    "name": "Mua Bán Mỹ Phẩm Chính Hãng",
    "url": "https://www.facebook.com/groups/984436066663988/"
  },
  {
    "stt": 101,
    "name": "ĐỒ GIA DỤNG GIÁ RẺ",
    "url": "https://www.facebook.com/groups/359624058142588/"
  },
  {
    "stt": 102,
    "name": "Trao đổi mua bán sách, truyện, tài liệu cũ",
    "url": "https://www.facebook.com/groups/477952032340642/"
  },
  {
    "stt": 103,
    "name": "Cộng Đồng Người Việt tại Nam California",
    "url": "https://www.facebook.com/groups/congdongnguoiviettainamcalifornia/"
  },
  {
    "stt": 104,
    "name": "Tổng Kho Bán Buôn Đồ Gia Dụng",
    "url": "https://www.facebook.com/groups/261089315726491/"
  },
  {
    "stt": 105,
    "name": "Affiliate TikTokShop - Kiếm tiền AFF với TikTok Shop",
    "url": "https://www.facebook.com/groups/771895667555962/"
  },
  {
    "stt": 106,
    "name": "Đồng Hồ Tissot Chính Hãng",
    "url": "https://www.facebook.com/groups/162363293585991/"
  },
  {
    "stt": 107,
    "name": "HỘI THANH LÝ TRANG SỨC CAO CẤP 💎 KIM CƯƠNG VIỆT NAM 🇻🇳",
    "url": "https://www.facebook.com/groups/ghienkimcuonghanoi/"
  },
  {
    "stt": 108,
    "name": "Hội sửa chữa - mua bán - trao đổi \"Điện Lạnh Hải Phòng\" 🔊",
    "url": "https://www.facebook.com/groups/1576027573238552/"
  },
  {
    "stt": 109,
    "name": "Thiết Kế Web - Thiết Kế Website Giá Rẻ Uy Tín",
    "url": "https://www.facebook.com/groups/thietkewebsite147/"
  },
  {
    "stt": 110,
    "name": "Thiết Kế Website",
    "url": "https://www.facebook.com/groups/thietkewebsite2020/"
  },
  {
    "stt": 111,
    "name": "Hội thiết kế website",
    "url": "https://www.facebook.com/groups/2182198332293340/"
  },
  {
    "stt": 112,
    "name": "Cộng Đồng Thiết Kế (Freelancer, Designer)",
    "url": "https://www.facebook.com/groups/designer.congdongdesign/"
  },
  {
    "stt": 113,
    "name": "Thiết Kế Website Theo Yêu Cầu !",
    "url": "https://www.facebook.com/groups/9788885511216732/"
  },
  {
    "stt": 114,
    "name": "Hội Thiết Kế Dạo (Freelance Designer jobs) thiết kế theo yêu cầu",
    "url": "https://www.facebook.com/groups/hoithietkedao.vn/"
  },
  {
    "stt": 115,
    "name": "Hội Chị Em Đam Mê Săn Tìm Vòng Tay Mã Não Bạch Nguyệt Quang",
    "url": "https://www.facebook.com/groups/bachnguyetquang/"
  },
  {
    "stt": 116,
    "name": "Hội Chuyên Salon & Nối Mi & Làm Nail Chuyên Nghiệp",
    "url": "https://www.facebook.com/groups/143419606205327/"
  },
  {
    "stt": 117,
    "name": "Tuyển mẫu Tóc, Nail, Mi, Makeup Sài Gòn",
    "url": "https://www.facebook.com/groups/305395494075666/"
  },
  {
    "stt": 118,
    "name": "Cần Thợ Nails - Mua Bán Tiệm Nails Tại USA",
    "url": "https://www.facebook.com/groups/322689276357835/"
  },
  {
    "stt": 119,
    "name": "Tuyển thợ nails spa Miền Nam",
    "url": "https://www.facebook.com/groups/670209461599645/"
  },
  {
    "stt": 120,
    "name": "Tuyển Mẫu Hải Phòng ( Nail , Mi and make up )",
    "url": "https://www.facebook.com/groups/564114947381345/"
  },
  {
    "stt": 121,
    "name": "Hội Tuyển Mẫu Nail - Mi - MakeUp Hải Phòng",
    "url": "https://www.facebook.com/groups/324815759792229/"
  },
  {
    "stt": 122,
    "name": "Hội Đam Mê Nails",
    "url": "https://www.facebook.com/groups/1173168903056457/"
  },
  {
    "stt": 123,
    "name": "Tâm Sự Ngành Nail",
    "url": "https://www.facebook.com/groups/936752586829769/"
  },
  {
    "stt": 124,
    "name": "Hội thợ Nails Sài Gòn",
    "url": "https://www.facebook.com/groups/hoithonailnook/"
  },
  {
    "stt": 125,
    "name": "Hội Nail TPHCM",
    "url": "https://www.facebook.com/groups/2221072894844451/"
  },
  {
    "stt": 126,
    "name": "Hội Thiết Kế Website, Chạy Quảng Cáo Và Seo Website",
    "url": "https://www.facebook.com/groups/thietkewebsitevachayquangcao/"
  },
  {
    "stt": 127,
    "name": "Hội Thiết Kế Có Tâm (Designer, Freelancer, Remote work) ✅",
    "url": "https://www.facebook.com/groups/thietke.cotam.4u/"
  },
  {
    "stt": 128,
    "name": "Hội Thiết Kế Website & SEO Web Online Chuyên Nghiệp",
    "url": "https://www.facebook.com/groups/1092055051827747/"
  },
  {
    "stt": 129,
    "name": "Thiết Kế Website Chuẩn Seo - Quảng cáo",
    "url": "https://www.facebook.com/groups/309302291838036/"
  },
  {
    "stt": 130,
    "name": "Thiết kế website giá rẻ",
    "url": "https://www.facebook.com/groups/thietkewebsitevn/"
  },
  {
    "stt": 131,
    "name": "Hội Thiết Kế Website Và SEO Web Online (FREELANCER)",
    "url": "https://www.facebook.com/groups/thietkewebfreelancer/"
  },
  {
    "stt": 132,
    "name": "Hội Thiết Kế Mobile App, Website Và Phần Mềm ERP",
    "url": "https://www.facebook.com/groups/apweb/"
  },
  {
    "stt": 133,
    "name": "Cộng đồng thiết kế website giá rẻ uy tín",
    "url": "https://www.facebook.com/groups/congdongthietkewebsitegiare/"
  },
  {
    "stt": 134,
    "name": "Hội thiết kế website và SEO web online",
    "url": "https://www.facebook.com/groups/196569564437739/"
  },
  {
    "stt": 135,
    "name": "Hội Thiết Kế Website Và SEO Web Online (FREELANCER UY TÍN)❤️",
    "url": "https://www.facebook.com/groups/392469703338464/"
  },
  {
    "stt": 136,
    "name": "Hội thiết kế website và SEO web Online",
    "url": "https://www.facebook.com/groups/622921407783809/"
  },
  {
    "stt": 137,
    "name": "Hội Thiết Kế Website-SEO Web",
    "url": "https://www.facebook.com/groups/774451800876383/"
  },
  {
    "stt": 138,
    "name": "Thiết Kế Website Chất lượng, Uy Tín, Chuyên Nghiệp",
    "url": "https://www.facebook.com/groups/944100723928827/"
  },
  {
    "stt": 139,
    "name": "Design & Dev Việt Nam – Branding, UX/UI, Website & App Development",
    "url": "https://www.facebook.com/groups/vieclamthietkewebsite/"
  },
  {
    "stt": 140,
    "name": "Hỗ Trợ WordPress Việt Nam",
    "url": "https://www.facebook.com/groups/hotrowpvn/"
  },
  {
    "stt": 141,
    "name": "Cộng Đồng Thiết Kế Website Uy Tín, Landing Page, Phầm Mềm Giá Rẻ",
    "url": "https://www.facebook.com/groups/design.website.seo/"
  },
  {
    "stt": 142,
    "name": "THIẾT KẾ WEBSITE",
    "url": "https://www.facebook.com/groups/mil0000/"
  },
  {
    "stt": 143,
    "name": "Claude Ai Community✅",
    "url": "https://www.facebook.com/groups/1685891735047297/"
  },
  {
    "stt": 144,
    "name": "Hội Thiết Kế Website",
    "url": "https://www.facebook.com/groups/hoithietkewebchuanseo/"
  },
  {
    "stt": 145,
    "name": "Thiết Kế Web - SEO - Marketing chuyên nghiệp",
    "url": "https://www.facebook.com/groups/640273041209300/"
  },
  {
    "stt": 146,
    "name": "Thiết Kế Website + Branding Thương hiệu (Nhóm chính thức)❤️",
    "url": "https://www.facebook.com/groups/393356319722107/"
  },
  {
    "stt": 147,
    "name": "Nhận Job Thiết kế Website - Cộng đồng UX/UI Designer",
    "url": "https://www.facebook.com/groups/444967414312587/"
  },
  {
    "stt": 148,
    "name": "Cộng Đồng Thiết Kế Website, Landing Page, App, SEO (Coder, IT, Freelancer)™",
    "url": "https://www.facebook.com/groups/863865008743750/"
  },
  {
    "stt": 149,
    "name": "Hội thiết kế website và SEO web Online",
    "url": "https://www.facebook.com/groups/1998083910206781/"
  },
  {
    "stt": 150,
    "name": "HỘI THIẾT KẾ WEBSITE GIÁ RẺ & CHẤT LƯỢNG 💻",
    "url": "https://www.facebook.com/groups/thietkewebchatluong/"
  },
  {
    "stt": 151,
    "name": "Thiết Kế Web Giá Rẻ - Code Theo Yêu Cầu",
    "url": "https://www.facebook.com/groups/thietkewebvietnam/"
  }
]

# 1. Tạo file Docx
from generate_docx import create_docx
script_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(script_dir)
docx_path = os.path.join(base_dir, "Danh_sach_151_nhom_Facebook.docx")
create_docx(raw_groups, docx_path)

# 2. Phân bổ đều 151 nhóm vào 3 tài khoản enabled: true
urls = [g["url"] for g in raw_groups]

# acc_1: 51 nhóm (0..50)
# acc_2: 50 nhóm (51..100)
# acc_3: 50 nhóm (101..150)
acc1_urls = urls[0:51]
acc2_urls = urls[51:101]
acc3_urls = urls[101:151]

config_path = os.path.join(script_dir, "groups-config.json")
with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

for acc in config["accounts"]:
    if acc["id"] == "acc_1":
        acc["enabled"] = True
        acc["groupUrls"] = acc1_urls
    elif acc["id"] == "acc_2":
        acc["enabled"] = True
        acc["groupUrls"] = acc2_urls
    elif acc["id"] == "acc_3":
        acc["enabled"] = True
        acc["groupUrls"] = acc3_urls

with open(config_path, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print(f"DONE: Docx created at {docx_path}")
print(f"DONE: acc_1={len(acc1_urls)}, acc_2={len(acc2_urls)}, acc_3={len(acc3_urls)} groups updated in groups-config.json")
