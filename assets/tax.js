/* tax.js — tính toán thuế & tiện ích số/ngày.
   Hàm thuần, không phụ thuộc DOM. Căn cứ pháp lý: xem docs/PHAP_LY.md
   Chạy được cả trên trình duyệt (window.Tax) và trên Node (module.exports). */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Tax = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---- Mặc định cho hộ kinh doanh vận tải hành khách ----
     Sửa được trong màn Cài đặt. Ngưỡng/tỷ lệ kèm căn cứ ở docs/PHAP_LY.md */
  var MAC_DINH = {
    tenHo: "",
    mst: "",
    diaChi: "",
    nganh: "Vận tải hành khách (taxi)",
    nguongMienThue: 1000000000, // NĐ 68/2026 (Điều 3, 4) — mức 01 tỷ/năm do NĐ 141/2026 sửa, hiệu lực 01/01/2026
    nguongHDDT: 1000000000, // NĐ 68/2026 — khoản 5 Điều 8 (sửa bởi NĐ 141/2026): doanh thu trên 01 tỷ phải dùng HĐĐT
    tyLeGTGT: 3, // % trên doanh thu
    tyLeTNCN: 1.5 // % trên doanh thu
  };

  var DINH_DANG_TY_LE = {
    gtgt: 3,
    tncn: 1.5
  };

  /* ---------- số ---------- */

  function lamTron(n) {
    n = Number(n);
    return isFinite(n) ? Math.round(n) : 0;
  }

  /* "1.250.000" | "1250000đ" | 1250000 -> 1250000 */
  function docSoTien(v) {
    if (typeof v === "number") return lamTron(v);
    if (v === null || v === undefined) return 0;
    var s = String(v).replace(/[^\d-]/g, "");
    if (!s || s === "-") return 0;
    return lamTron(parseInt(s, 10));
  }

  /* 1250000 -> "1.250.000" */
  function dinhDangTien(n) {
    n = lamTron(n);
    var am = n < 0;
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (am ? "-" : "") + s;
  }

  function tienVND(n) {
    return dinhDangTien(n) + " đ";
  }

  /* Định dạng khi đang gõ: bỏ hết ký tự lạ rồi chèn dấu chấm nghìn */
  function dinhDangNhap(chuoi) {
    var am = /^\s*-/.test(String(chuoi || ""));
    var s = String(chuoi || "").replace(/[^\d]/g, "");
    if (!s) return "";
    s = String(parseInt(s, 10)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (am ? "-" : "") + s;
  }

  /* Rút gọn cho chip/nhãn: 50000000 -> "50 tr", 1500000 -> "1,5 tr" */
  function gonTien(n) {
    n = lamTron(n);
    if (n >= 1000000000) return trimSo(n / 1000000000) + " tỷ";
    if (n >= 1000000) return trimSo(n / 1000000) + " tr";
    if (n >= 1000) return trimSo(n / 1000) + "k";
    return String(n);
  }

  function trimSo(x) {
    var s = (Math.round(x * 10) / 10).toString().replace(".", ",");
    return s;
  }

  /* ---------- ngày ---------- */

  function haiChu(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function isoCua(d) {
    return d.getFullYear() + "-" + haiChu(d.getMonth() + 1) + "-" + haiChu(d.getDate());
  }

  function homNay(d) {
    return isoCua(d || new Date());
  }

  /* "2026-11-12" -> {y:2026, m:11, d:12} */
  function tachNgay(iso) {
    var p = String(iso || "").split("-");
    return { y: parseInt(p[0], 10) || 0, m: parseInt(p[1], 10) || 0, d: parseInt(p[2], 10) || 0 };
  }

  function namCua(gd) {
    return tachNgay(gd && gd.date).y;
  }

  function thangCua(gd) {
    return tachNgay(gd && gd.date).m;
  }

  function quyCuaThang(m) {
    return Math.floor((m - 1) / 3) + 1;
  }

  function nhanQuy(q) {
    return "Quý " + ["I", "II", "III", "IV"][q - 1];
  }

  function tenThang(m) {
    return "Tháng " + m + "/";
  }

  /* Ngày cuối cùng của tháng (m 1..12) */
  function ngayCuoiThang(y, m) {
    return new Date(y, m, 0).getDate();
  }

  /* Hạn nộp hồ sơ khai thuế theo quý: ngày cuối cùng của tháng đầu quý sau
     (NĐ 68/2026 — khoản 3 Điều 8). */
  function hanNopQuy(y, q) {
    var thangHan = q * 3 + 1; // Q1->4, Q2->7, Q3->10, Q4->13
    var namHan = y;
    if (thangHan > 12) {
      thangHan -= 12;
      namHan += 1;
    }
    return namHan + "-" + haiChu(thangHan) + "-" + haiChu(ngayCuoiThang(namHan, thangHan));
  }

  function soNgayLech(isoA, isoB) {
    var a = tachNgay(isoA), b = tachNgay(isoB);
    var ta = Date.UTC(a.y, a.m - 1, a.d), tb = Date.UTC(b.y, b.m - 1, b.d);
    return Math.round((ta - tb) / 86400000);
  }

  /* 'qua' | 'homnay' | 'sap' | 'con'  (so với ngày hôm nay) */
  function trangThaiHan(iso, homNayIso) {
    var d = soNgayLech(iso, homNayIso);
    if (d < 0) return "qua";
    if (d === 0) return "homnay";
    if (d <= 10) return "sap";
    return "con";
  }

  /* ---------- lọc & tổng ---------- */

  function locTheoNam(ds, y) {
    return ds.filter(function (gd) { return namCua(gd) === y; });
  }

  function locTheoThang(ds, y, m) {
    return ds.filter(function (gd) { return namCua(gd) === y && thangCua(gd) === m; });
  }

  function tongTien(ds) {
    var t = 0;
    for (var i = 0; i < ds.length; i++) t += lamTron(ds[i].amount);
    return t;
  }

  function tongTheoHinhThuc(ds) {
    var r = { cash: 0, transfer: 0, total: 0, soCuoc: ds.length };
    for (var i = 0; i < ds.length; i++) {
      var t = lamTron(ds[i].amount);
      if (ds[i].method === "transfer") r.transfer += t; else r.cash += t;
      r.total += t;
    }
    return r;
  }

  /* Nhóm theo ngày, mới nhất trước; trong ngày mới nhất trước */
  function nhomTheoNgay(ds) {
    var map = {}, thuTu = [];
    for (var i = 0; i < ds.length; i++) {
      var k = ds[i].date;
      if (!map[k]) { map[k] = []; thuTu.push(k); }
      map[k].push(ds[i]);
    }
    thuTu.sort(function (a, b) { return a < b ? 1 : a > b ? -1 : 0; });
    return thuTu.map(function (k) {
      var ngay = map[k].slice().sort(function (a, b) {
        var x = a.time || "", y = b.time || "";
        return x < y ? 1 : x > y ? -1 : 0;
      });
      return { date: k, items: ngay, tong: tongTheoHinhThuc(ngay) };
    });
  }

  /* ---------- thuế ---------- */

  function tinhThue(doanhThu, tyLeGTGT, tyLeTNCN) {
    var dt = lamTron(doanhThu);
    var gtgt = lamTron(dt * (Number(tyLeGTGT) || 0) / 100);
    var tncn = lamTron(dt * (Number(tyLeTNCN) || 0) / 100);
    return { doanhThu: dt, gtgt: gtgt, tncn: tncn, tong: gtgt + tncn };
  }

  function theoQuy(ds, y, tyLeGTGT, tyLeTNCN) {
    var dsNam = locTheoNam(ds, y);
    var ra = [];
    for (var q = 1; q <= 4; q++) {
      var thangDau = (q - 1) * 3 + 1;
      var cuaQuy = dsNam.filter(function (gd) {
        var m = thangCua(gd);
        return m >= thangDau && m <= thangDau + 2;
      });
      var t = tongTheoHinhThuc(cuaQuy);
      var thue = tinhThue(t.total, tyLeGTGT, tyLeTNCN);
      ra.push({
        quy: q,
        doanhThu: t.total,
        cash: t.cash,
        transfer: t.transfer,
        soCuoc: t.soCuoc,
        gtgt: thue.gtgt,
        tncn: thue.tncn,
        tongThue: thue.tong,
        hanNop: hanNopQuy(y, q)
      });
    }
    return ra;
  }

  /* Tình trạng so với các ngưỡng pháp lý:
     - nguongMienThue: doanh thu năm TỪ MỨC NÀY TRỞ XUỐNG thì không chịu GTGT và
       không phải nộp TNCN (NĐ 68/2026 Điều 3, 4 — mức 01 tỷ/năm do NĐ 141/2026).
     - nguongHDDT: doanh thu năm TRÊN mức này thì bắt buộc dùng hoá đơn điện tử;
       chạm mốc (đạt hoặc vượt) là mốc đăng ký trong 30 ngày. */
  function tinhTrang(doanhThuNam, nguongMienThue, nguongHDDT) {
    var n1 = lamTron(nguongMienThue) || 1000000000;
    var n2 = lamTron(nguongHDDT) || 1000000000;
    var dt = lamTron(doanhThuNam);
    return {
      doanhThu: dt,
      nguongMienThue: n1,
      nguongHDDT: n2,
      mienThue: dt <= n1,
      vuotMienThue: dt > n1,
      batBuocHDDT: dt > n2,
      chamNguongHDDT: dt >= n2,
      conLaiToiMienThue: Math.max(0, n1 - dt),
      conLaiToiHDDT: Math.max(0, n2 - dt),
      phanTramMienThue: Math.min(100, n1 > 0 ? (dt / n1) * 100 : 0),
      phanTramHDDT: Math.min(100, n2 > 0 ? (dt / n2) * 100 : 0)
    };
  }

  /* ---- Cách tính thuế TNCN (khoản 5 Điều 4 NĐ 68/2026, sửa bởi NĐ 141/2026):
     - doanh thu năm từ ngưỡng miễn thuế trở xuống: không phải nộp;
     - trên ngưỡng đến 03 tỷ: theo tỷ lệ % ngành × doanh thu, HOẶC tự chọn
       "thu nhập tính thuế × thuế suất" và giữ ổn định 02 năm;
     - trên 03 tỷ: bắt buộc theo thu nhập tính thuế × thuế suất. ---- */
  var MOC_THU_NHAP = 3000000000;

  function cachTNCN(doanhThu, nguongMienThue) {
    var dt = lamTron(doanhThu);
    var n1 = lamTron(nguongMienThue) || 1000000000;
    if (dt <= n1) {
      return {
        ma: "mien",
        ten: "Không phải nộp TNCN",
        phu: "Doanh thu cả năm từ " + dinhDangTien(n1) + " đ trở xuống.",
        theoThuNhap: false
      };
    }
    if (dt <= MOC_THU_NHAP) {
      return {
        ma: "lua-chon",
        ten: "Được chọn một trong hai cách",
        phu: "Cách 1: tỷ lệ % ngành × doanh thu (ứng dụng đang tính cách này). " +
          "Cách 2: thu nhập tính thuế × thuế suất — đã chọn cách 2 thì giữ ổn định 02 năm liên tục.",
        theoThuNhap: false
      };
    }
    return {
      ma: "theo-thu-nhap",
      ten: "Bắt buộc theo thu nhập tính thuế",
      phu: "Doanh thu năm trên 03 tỷ đồng: TNCN = (doanh thu − chi phí được trừ) × thuế suất. " +
        "Cần số liệu chi phí có hoá đơn, chứng từ mới tính được.",
      theoThuNhap: true
    };
  }

  /* ---- Bậc thuế suất TNCN khi tính theo thu nhập tính thuế (khoản 2 Điều 7
     Luật Thuế TNCN 109/2025/QH15, dẫn chiếu tại điểm b khoản 5 Điều 4
     NĐ 68/2026). Bậc xác định theo doanh thu năm; chỉ để tham khảo vì cách tính
     này còn cần số liệu chi phí được trừ — phải đối chiếu với cục thuế. ---- */
  var BAC_TNCN = [
    { tu: 1000000000, den: 3000000000, tyLe: 15 },
    { tu: 3000000000, den: 50000000000, tyLe: 17 },
    { tu: 50000000000, den: Infinity, tyLe: 20 }
  ];

  function bacTNCN(doanhThu) {
    var dt = lamTron(doanhThu);
    for (var i = 0; i < BAC_TNCN.length; i++) {
      if (dt > BAC_TNCN[i].tu && dt <= BAC_TNCN[i].den) return BAC_TNCN[i];
    }
    return null;
  }

  /* ---------- tổng hợp một năm ---------- */

  function tongHop(ds, y, caiDat) {
    var cd = caiDat || MAC_DINH;
    var dsNam = locTheoNam(ds, y);
    var t = tongTheoHinhThuc(dsNam);
    var thue = tinhThue(t.total, cd.tyLeGTGT, cd.tyLeTNCN);
    return {
      nam: y,
      soCuoc: t.soCuoc,
      cash: t.cash,
      transfer: t.transfer,
      doanhThu: t.total,
      gtgt: thue.gtgt,
      tncn: thue.tncn,
      tongThue: thue.tong,
      tinhTrang: tinhTrang(t.total, cd.nguongMienThue, cd.nguongHDDT),
      quy: theoQuy(ds, y, cd.tyLeGTGT, cd.tyLeTNCN)
    };
  }

  /* Các tháng trong năm có phát sinh, để vẽ biểu đồ cột đơn giản */
  function theoThang(ds, y) {
    var dsNam = locTheoNam(ds, y);
    var ra = [];
    for (var m = 1; m <= 12; m++) {
      var cuaThang = dsNam.filter(function (gd) { return thangCua(gd) === m; });
      var t = tongTheoHinhThuc(cuaThang);
      ra.push({ thang: m, doanhThu: t.total, cash: t.cash, transfer: t.transfer, soCuoc: t.soCuoc });
    }
    return ra;
  }

  /* ---------- đọc số thành chữ ---------- */

  var CHU = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  var DON_VI = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

  function docNhom(g, dayDu) {
    var tram = Math.floor(g / 100), chuc = Math.floor((g % 100) / 10), dv = g % 10;
    var ra = [];
    if (tram > 0 || dayDu) ra.push(CHU[tram] + " trăm");
    if (chuc === 0) {
      if (dv > 0) ra.push((tram > 0 || dayDu) ? "linh " + CHU[dv] : CHU[dv]);
    } else if (chuc === 1) {
      ra.push(dv === 0 ? "mười" : "mười " + (dv === 5 ? "lăm" : CHU[dv]));
    } else {
      ra.push(CHU[chuc] + " mươi" + (dv === 0 ? "" : dv === 1 ? " mốt" : dv === 5 ? " lăm" : " " + CHU[dv]));
    }
    return ra.join(" ");
  }

  function docSo(n) {
    n = Math.round(Math.abs(Number(n) || 0));
    if (n === 0) return "không";
    if (n > 999999999999999) return "số quá lớn";
    var nhom = [];
    while (n > 0) { nhom.push(n % 1000); n = Math.floor(n / 1000); }
    var ra = [];
    for (var i = nhom.length - 1; i >= 0; i--) {
      var g = nhom[i];
      if (g === 0) continue;
      var dayDu = i < nhom.length - 1;
      ra.push(docNhom(g, dayDu) + (DON_VI[i] ? " " + DON_VI[i] : ""));
    }
    return ra.join(" ").replace(/\s+/g, " ").trim();
  }

  function docTien(n) {
    var s = docSo(n);
    return s.charAt(0).toUpperCase() + s.slice(1) + " đồng";
  }

  /* ---------- CSV ---------- */

  function csv(ds) {
    var dong = ["Ngày,Giờ,Số tiền (đ),Hình thức,Ghi chú,Số hóa đơn"];
    var sap = ds.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      var x = a.time || "", y2 = b.time || "";
      return x < y2 ? -1 : x > y2 ? 1 : 0;
    });
    for (var i = 0; i < sap.length; i++) {
      var g = sap[i];
      dong.push([
        g.date,
        g.time || "",
        lamTron(g.amount),
        g.method === "transfer" ? "Chuyển khoản" : "Tiền mặt",
        boc(g.note),
        boc(g.invoice)
      ].join(","));
    }
    return "\ufeff" + dong.join("\r\n") + "\r\n";
  }

  function boc(v) {
    var s = v === null || v === undefined ? "" : String(v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  return {
    MAC_DINH: MAC_DINH,
    DINH_DANG_TY_LE: DINH_DANG_TY_LE,
    lamTron: lamTron,
    docSoTien: docSoTien,
    dinhDangTien: dinhDangTien,
    tienVND: tienVND,
    dinhDangNhap: dinhDangNhap,
    gonTien: gonTien,
    docSo: docSo,
    docTien: docTien,
    isoCua: isoCua,
    homNay: homNay,
    tachNgay: tachNgay,
    namCua: namCua,
    thangCua: thangCua,
    quyCuaThang: quyCuaThang,
    nhanQuy: nhanQuy,
    ngayCuoiThang: ngayCuoiThang,
    hanNopQuy: hanNopQuy,
    soNgayLech: soNgayLech,
    trangThaiHan: trangThaiHan,
    locTheoNam: locTheoNam,
    locTheoThang: locTheoThang,
    tongTien: tongTien,
    tongTheoHinhThuc: tongTheoHinhThuc,
    nhomTheoNgay: nhomTheoNgay,
    tinhThue: tinhThue,
    theoQuy: theoQuy,
    theoThang: theoThang,
    tinhTrang: tinhTrang,
    cachTNCN: cachTNCN,
    MOC_THU_NHAP: MOC_THU_NHAP,
    bacTNCN: bacTNCN,
    tongHop: tongHop,
    csv: csv
  };
});
