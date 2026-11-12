/* app.js — điều khiển giao diện Sổ doanh thu hộ kinh doanh */
(function () {
  "use strict";

  var T = window.Tax;
  var S = window.Store;

  var dl = null;
  var dangSua = null;         // id giao dịch đang sửa
  var hinhDangChon = "cash";
  var manDangMo = "ghi";
  var thangDangXem = "";      // "YYYY-MM"
  var namDangXem = 0;

  /* ================= tiện ích ================= */

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function soCaiDat(khoa, macDinh) {
    var v = dl.settings[khoa];
    if (v === undefined || v === null || v === "") return macDinh;
    var n = Number(v);
    return isFinite(n) ? n : macDinh;
  }

  function caiDat() {
    return {
      tenHo: dl.settings.tenHo || "",
      mst: dl.settings.mst || "",
      diaChi: dl.settings.diaChi || "",
      nguongMienThue: soCaiDat("nguongMienThue", T.MAC_DINH.nguongMienThue),
      nguongHDDT: soCaiDat("nguongHDDT", T.MAC_DINH.nguongHDDT),
      tyLeGTGT: soCaiDat("tyLeGTGT", T.MAC_DINH.tyLeGTGT),
      tyLeTNCN: soCaiDat("tyLeTNCN", T.MAC_DINH.tyLeTNCN)
    };
  }

  function haiChu(n) { return (n < 10 ? "0" : "") + n; }

  function gioHienTai(d) {
    d = d || new Date();
    return haiChu(d.getHours()) + ":" + haiChu(d.getMinutes());
  }

  var THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  function nhanNgay(iso) {
    var p = T.tachNgay(iso);
    if (!p.y) return iso;
    var d = new Date(p.y, p.m - 1, p.d);
    return THU[d.getDay()] + ", " + p.d + "/" + p.m + "/" + p.y;
  }

  function nhanNgayNgan(iso) {
    var p = T.tachNgay(iso);
    return p.d + "/" + p.m;
  }

  /* ================= thông báo & tấm che ================= */

  var henGio = null;

  function bao(chu) {
    var el = $("bao");
    el.textContent = chu;
    el.classList.add("hien");
    clearTimeout(henGio);
    henGio = setTimeout(function () { el.classList.remove("hien"); }, 2200);
  }

  function moTam(html) {
    $("che-tam").innerHTML = html;
    $("che").classList.add("hien");
  }
  function dongTam() {
    $("che").classList.remove("hien");
    $("che-tam").innerHTML = "";
  }

  /* ================= dữ liệu ================= */

  function luu(imLang) {
    var kq = S.ghi(dl);
    if (!kq.ok && !imLang) {
      bao("Chưa lưu lâu dài được — hãy sao lưu ra tệp");
    }
    kiemTraLuuTru();
    return kq;
  }

  function giaoDichHomNay() {
    var hn = T.homNay();
    return dl.transactions.filter(function (g) { return g.date === hn; });
  }

  /* ================= kiểm tra lưu trữ ================= */

  function kiemTraLuuTru() {
    var tt = S.trangThai();
    var canh = $("canh-bao-luu");
    var coVanDe = tt.dungTam || !tt.coLocalStorage;
    if (coVanDe && !canh) {
      canh = document.createElement("div");
      canh.id = "canh-bao-luu";
      canh.className = "canh-bao do";
      canh.innerHTML = "<div><b>Cách mở này không lưu được lâu dài.</b> " +
        "Dữ liệu chỉ nằm trong bộ nhớ tạm và mất khi đóng trang. " +
        "Hãy vào <b>Cài đặt → Sao lưu ra tệp</b> sau mỗi lần nhập, hoặc mở app qua địa chỉ web (xem README).</div>";
      var main = document.querySelector("main");
      main.insertBefore(canh, main.firstChild);
    } else if (!coVanDe && canh) {
      canh.parentNode.removeChild(canh);
    }
    var ttEl = $("cd-trang-thai-luu");
    if (ttEl) {
      if (coVanDe) {
        ttEl.innerHTML = '<span class="do"><b>Đang lưu tạm.</b> ' +
          esc(tt.loi || "Trình duyệt chặn lưu trữ ở cách mở này.") +
          " Hãy sao lưu ra tệp.</span>";
      } else {
        ttEl.innerHTML = '<span class="luc">Đang lưu trên máy (localStorage). Dữ liệu còn lại sau khi đóng app.</span>';
      }
    }
  }

  /* ================= TAB ================= */

  function moMan(ten) {
    manDangMo = ten;
    var ds = document.querySelectorAll(".man");
    for (var i = 0; i < ds.length; i++) ds[i].classList.remove("dang-mo");
    var el = $("man-" + ten);
    if (el) el.classList.add("dang-mo");

    var nut = document.querySelectorAll("nav.tab-duoi button");
    for (var j = 0; j < nut.length; j++) {
      nut[j].classList.toggle("dang-chon", nut[j].getAttribute("data-man") === ten);
    }
    window.scrollTo(0, 0);
    if (ten === "thue") veThue();
    if (ten === "so") veSo();
    if (ten === "cd") veCaiDat();
  }

  /* ================= MÀN GHI THU ================= */

  function veGoiY() {
    var p = $("o-tien").value;
    var n = T.docSoTien(p);
    $("doc-tien").textContent = n > 0 ? docTien(n) : "Không đồng";
  }

  function datHinh(h) {
    hinhDangChon = h;
    var nut = document.querySelectorAll("#chon-hinh button");
    for (var i = 0; i < nut.length; i++) {
      nut[i].classList.toggle("chon", nut[i].getAttribute("data-hinh") === h);
    }
  }

  function xoaForm() {
    $("o-tien").value = "";
    $("o-ghi-chu").value = "";
    $("o-hoa-don").value = "";
    dangSua = null;
    $("nut-luu").textContent = "Lưu khoản thu";
    veGoiY();
  }

  function luuKhoanThu() {
    var tien = T.docSoTien($("o-tien").value);
    if (tien <= 0) {
      bao("Chưa nhập số tiền");
      $("o-tien").focus();
      return;
    }
    var ngay = $("o-ngay").value || T.homNay();
    var gio = $("o-gio").value || gioHienTai();
    var ghiChu = $("o-ghi-chu").value.trim();
    var hoaDon = $("o-hoa-don").value.trim();

    var kq;
    if (dangSua) {
      for (var i = 0; i < dl.transactions.length; i++) {
        if (dl.transactions[i].id === dangSua) {
          dl.transactions[i].date = ngay;
          dl.transactions[i].time = gio;
          dl.transactions[i].amount = tien;
          dl.transactions[i].method = hinhDangChon;
          dl.transactions[i].note = ghiChu;
          dl.transactions[i].invoice = hoaDon;
          break;
        }
      }
      kq = luu();
      bao("Đã sửa: " + T.tienVND(tien));
      xoaForm();
    } else {
      dl.transactions.push({
        id: S.taoId(),
        date: ngay,
        time: gio,
        amount: tien,
        method: hinhDangChon,
        note: ghiChu,
        invoice: hoaDon
      });
      kq = luu();
      bao("Đã lưu " + T.tienVND(tien));
      $("o-tien").value = "";
      $("o-ghi-chu").value = "";
      $("o-hoa-don").value = "";
      $("o-gio").value = gioHienTai();
    }
    $("goi-y-luu").textContent = kq.ok
      ? "Đã lưu trên máy lúc " + gioHienTai()
      : "Lưu tạm (xem cảnh báo phía trên)";
    veGoiY();
    veGoiMan();
    veGoiSo();
  }

  function dongGiaoDich(id) {
    var g = null;
    for (var i = 0; i < dl.transactions.length; i++) {
      if (dl.transactions[i].id === id) { g = dl.transactions[i]; break; }
    }
    if (!g) return;
    var hinh = g.method === "transfer" ? "Chuyển khoản" : "Tiền mặt";
    moTam(
      '<h3>' + T.tienVND(g.amount) + "</h3>" +
      '<div class="nho" style="margin-bottom:4px">' + esc(nhanNgay(g.date)) + (g.time ? " · " + esc(g.time) : "") + "</div>" +
      '<div class="nho" style="margin-bottom:4px">Hình thức: <b>' + hinh + "</b></div>" +
      (g.note ? '<div class="nho" style="margin-bottom:4px">Ghi chú: ' + esc(g.note) + "</div>" : "") +
      (g.invoice ? '<div class="nho" style="margin-bottom:4px">Hoá đơn: ' + esc(g.invoice) + "</div>" : "") +
      '<div class="gach"></div>' +
      '<button class="nut" type="button" id="nut-sua-gd">Sửa khoản này</button>' +
      '<button class="nut do" type="button" id="nut-xoa-gd">Xoá khoản này</button>' +
      '<button class="nut phu" type="button" id="nut-dong-tam">Đóng</button>'
    );
    $("nut-sua-gd").onclick = function () {
      dangSua = g.id;
      $("o-tien").value = T.dinhDangNhap(String(g.amount));
      $("o-ngay").value = g.date;
      $("o-gio").value = g.time || "";
      $("o-ghi-chu").value = g.note || "";
      $("o-hoa-don").value = g.invoice || "";
      datHinh(g.method);
      $("nut-luu").textContent = "Cập nhật khoản thu";
      veGoiY();
      dongTam();
      moMan("ghi");
      bao("Đang sửa — bấm Cập nhật để lưu");
    };
    $("nut-xoa-gd").onclick = function () {
      if (!window.confirm("Xoá khoản thu " + T.tienVND(g.amount) + " ngày " + g.date + "?")) return;
      dl.transactions = dl.transactions.filter(function (x) { return x.id !== g.id; });
      luu();
      if (dangSua === g.id) xoaForm();
      dongTam();
      bao("Đã xoá");
      veGoiMan();
      veGoiSo();
      veThue();
    };
    $("nut-dong-tam").onclick = dongTam;
  }

  function veGoiMan() {
    var ds = giaoDichHomNay();
    var t = T.tongTheoHinhThuc(ds);
    $("hn-tong").textContent = T.tienVND(t.total);
    $("hn-cuoc").textContent = t.soCuoc + " cuốc";
    $("hn-cash").textContent = T.tienVND(t.cash);
    $("hn-transfer").textContent = T.tienVND(t.transfer);
    $("phu-header").textContent = "Hôm nay " + T.tienVND(t.total);

    var ra = $("ds-hom-nay");
    if (!ds.length) {
      ra.innerHTML = '<div class="trong"><div class="to">🧾</div>Chưa ghi khoản nào hôm nay</div>';
      return;
    }
    ds.sort(function (a, b) { return (b.time || "").localeCompare(a.time || ""); });
    ra.innerHTML = ds.map(dongHTML).join("");
    ganSuKienDong(ra);
  }

  function dongHTML(g) {
    var hinh = g.method === "transfer" ? "Chuyển khoản" : "Tiền mặt";
    var chu = [g.time ? g.time : "", hinh, g.note ? g.note : ""].filter(Boolean).join(" · ");
    return '<button class="gd" type="button" data-id="' + esc(g.id) + '">' +
      '<span class="bieu ' + g.method + '">' + (g.method === "transfer" ? "CK" : "TM") + "</span>" +
      '<span class="giua-gd"><span class="t1">' + T.tienVND(g.amount) + "</span>" +
      '<span class="t2">' + esc(chu) + "</span></span>" +
      '<span class="mo">›</span></button>';
  }

  function ganSuKienDong(goc) {
    var nut = goc.querySelectorAll(".gd");
    for (var i = 0; i < nut.length; i++) {
      nut[i].onclick = function () { dongGiaoDich(this.getAttribute("data-id")); };
    }
  }

  /* ================= MÀN SỔ ================= */

  function thangMacDinh() {
    var hn = T.homNay().split("-");
    return hn[0] + "-" + hn[1];
  }

  function dsThangNay() {
    var p = thangDangXem.split("-");
    var y = parseInt(p[0], 10), m = parseInt(p[1], 10);
    var ds = T.locTheoThang(dl.transactions, y, m);
    var loc = $("o-loc-hinh").value;
    if (loc !== "all") ds = ds.filter(function (g) { return g.method === loc; });
    return ds;
  }

  function veSo() {
    if (!thangDangXem) thangDangXem = thangMacDinh();
    $("o-thang").value = thangDangXem;

    var ds = dsThangNay();
    var t = T.tongTheoHinhThuc(ds);
    var p = thangDangXem.split("-");
    $("tong-thang").innerHTML =
      '<div class="hang"><span class="nhan">Doanh thu tháng ' + parseInt(p[1], 10) + "/" + p[0] + '</span></div>' +
      '<div class="so-lon">' + T.tienVND(t.total) + "</div>" +
      '<div class="nho" style="margin-top:4px">' + t.soCuoc + " cuốc · " +
      "Tiền mặt <b>" + T.tienVND(t.cash) + "</b> · Chuyển khoản <b>" + T.tienVND(t.transfer) + "</b></div>";

    var ra = $("ds-thang");
    if (!ds.length) {
      ra.innerHTML = '<div class="trong"><div class="to">📅</div>Tháng này chưa có khoản thu nào</div>';
      return;
    }
    var nhom = T.nhomTheoNgay(ds);
    ra.innerHTML = nhom.map(function (n) {
      return '<div class="ngay"><div class="dau-ngay">' +
        '<span class="t">' + esc(nhanNgay(n.date)) + "</span>" +
        '<span class="t so">' + T.tienVND(n.tong.total) + "</span></div>" +
        n.items.map(dongHTML).join("") + "</div>";
    }).join("");
    ganSuKienDong(ra);
  }

  function xuatCSV(ds, ten) {
    var noiDung = T.csv(ds);
    var ok = S.taiTep(ten, noiDung, "text/csv;charset=utf-8");
    bao(ok ? "Đã tạo tệp " + ten : "Trình duyệt không cho tải tệp");
  }

  /* ================= MÀN THUẾ ================= */

  function dsNam() {
    var set = {};
    var hn = T.tachNgay(T.homNay()).y;
    set[hn] = true;
    dl.transactions.forEach(function (g) { set[T.namCua(g)] = true; });
    return Object.keys(set).map(Number).filter(Boolean).sort(function (a, b) { return b - a; });
  }

  function veChonNam() {
    var sel = $("o-nam");
    var ds = dsNam();
    if (ds.indexOf(namDangXem) < 0) namDangXem = ds[0];
    sel.innerHTML = ds.map(function (y) {
      return '<option value="' + y + '"' + (y === namDangXem ? " selected" : "") + ">" + y + "</option>";
    }).join("");
  }

  function ct(n) { return T.tienVND(n); }

  function veThue() {
    if (!namDangXem) namDangXem = T.tachNgay(T.homNay()).y;
    veChonNam();
    var cd = caiDat();
    var y = namDangXem;
    var th = T.tongHop(dl.transactions, y, cd);
    var tt = th.tinhTrang;

    $("th-nhan-nam").textContent = y;
    $("th-doanh-thu").textContent = ct(th.doanhThu);
    $("th-cuoc").textContent = th.soCuoc + " cuốc trong năm";
    $("th-cash").textContent = ct(th.cash);
    $("th-transfer").textContent = ct(th.transfer);

    /* hai mốc ngưỡng */
    var m1 = tt.phanTramMienThue;
    var thanh1 = $("th-moc-1-thanh");
    thanh1.style.width = m1.toFixed(1) + "%";
    thanh1.parentNode.className = "thanh" + (tt.vuotMienThue ? " cam" : m1 > 80 ? " cam" : " luc");
    $("th-moc-1-nhan").innerHTML = "Mốc miễn thuế " + ct(tt.nguongMienThue) +
      " — đã đạt <b>" + m1.toFixed(1) + "%</b>" +
      (tt.vuotMienThue
        ? ' · <span class="do">đã vượt ' + ct(tt.doanhThu - tt.nguongMienThue) + "</span>"
        : " · còn " + ct(tt.conLaiToiMienThue));

    var m2 = tt.phanTramHDDT;
    var thanh2 = $("th-moc-2-thanh");
    thanh2.style.width = m2.toFixed(1) + "%";
    thanh2.parentNode.className = "thanh" + (tt.chamNguongHDDT ? " do" : m2 > 80 ? " cam" : "");
    $("th-moc-2-nhan").innerHTML = "Mốc hoá đơn điện tử " + ct(tt.nguongHDDT) +
      " — đã đạt <b>" + m2.toFixed(1) + "%</b>" +
      (tt.batBuocHDDT
        ? ' · <span class="do">đã vượt mốc — bắt buộc dùng hoá đơn điện tử</span>'
        : tt.chamNguongHDDT
          ? ' · <span class="do">vừa chạm mốc — phải đăng ký trong 30 ngày</span>'
          : " · còn " + ct(tt.conLaiToiHDDT));

    /* thuế */
    $("th-tyle-gtgt").textContent = String(cd.tyLeGTGT).replace(".", ",");
    $("th-tyle-tncn").textContent = String(cd.tyLeTNCN).replace(".", ",");
    $("th-gtgt").textContent = ct(th.gtgt);
    $("th-tncn").textContent = ct(th.tncn);
    $("th-tong").textContent = ct(th.tongThue);
    $("th-ghi-chu-thue").innerHTML = tt.mienThue
      ? "Doanh thu cả năm đang <b>từ " + ct(tt.nguongMienThue) + " trở xuống</b> nên theo quy định hiện hành hộ <b>không phải nộp</b> GTGT và TNCN. Số trên chỉ là con số tham khảo nếu vượt ngưỡng."
      : "Đây là <b>ước tính</b> theo tỷ lệ % đã cài (cách tính trên doanh thu). Con số chính thức do cơ quan thuế xác định khi khai; nếu Sếp chọn cách tính trên thu nhập tính thuế thì số sẽ khác.";

    /* bảng quý */
    var tong = { dt: 0, thue: 0 };
    var hang = th.quy.map(function (q) {
      tong.dt += q.doanhThu;
      tong.thue += q.tongThue;
      var ttHan = T.trangThaiHan(q.hanNop, T.homNay());
      var nhanHan = T.tachNgay(q.hanNop);
      var badge = "";
      if (q.doanhThu > 0) {
        if (ttHan === "qua") badge = '<span class="badge qua">Quá hạn</span>';
        else if (ttHan === "homnay") badge = '<span class="badge sap">Hôm nay</span>';
        else if (ttHan === "sap") badge = '<span class="badge sap">Còn ' + T.soNgayLech(q.hanNop, T.homNay()) + " ngày</span>";
        else badge = '<span class="badge mo">' + T.soNgayLech(q.hanNop, T.homNay()) + " ngày</span>";
      }
      var canhBao = q.doanhThu > 0 && ttHan === "qua" ? ' <span class="rat-nho do">kiểm tra đã nộp chưa</span>' : "";
      return "<tr><td>" + T.nhanQuy(q.quy) +
        '<div class="rat-nho">' + q.soCuoc + " cuốc</div></td>" +
        '<td>' + ct(q.doanhThu) + "</td>" +
        '<td>' + ct(q.tongThue) + "</td>" +
        '<td>' + nhanHan.d + "/" + nhanHan.m + "<br>" + badge + canhBao + "</td></tr>";
    }).join("");
    hang += '<tr class="tong"><td>Cả năm</td><td>' + ct(tong.dt) + "</td><td>" + ct(tong.thue) + "</td><td></td></tr>";
    $("th-bang-quy").innerHTML = hang;

    /* biểu đồ tháng */
    var thang = T.theoThang(dl.transactions, y);
    var max = thang.reduce(function (a, b) { return Math.max(a, b.doanhThu); }, 0);
    $("th-bieu-do").innerHTML = thang.map(function (m) {
      var cao = max > 0 ? Math.round((m.doanhThu / max) * 68) : 0;
      return '<div title="Tháng ' + m.thang + '"><div class="cot" style="height:' + Math.max(cao, m.doanhThu > 0 ? 3 : 0) +
        'px"></div><div class="nhan-t">' + m.thang + "</div></div>";
    }).join("");
    var thangCaoNhat = thang.reduce(function (a, b) { return b.doanhThu > a.doanhThu ? b : a; }, thang[0]);
    $("th-bieu-do-nhan").textContent = thangCaoNhat.doanhThu > 0
      ? "Cao nhất: tháng " + thangCaoNhat.thang + " — " + ct(thangCaoNhat.doanhThu)
      : "Chưa có doanh thu trong năm " + y;

    veCanhBao(tt, cd, y);
    veViecPhaiLam(tt, cd, y, tong);
  }

  function veCanhBao(tt, cd, y) {
    var ra = [];
    if (tt.batBuocHDDT) {
      ra.push('<div class="canh-bao do"><div><b>Đã vượt mốc hoá đơn điện tử.</b> Doanh thu năm trên ' +
        ct(tt.nguongHDDT) + " thì phải dùng <b>hoá đơn điện tử có mã của cơ quan thuế</b> hoặc <b>hoá đơn điện tử khởi tạo từ máy tính tiền</b> có kết nối với cơ quan thuế. " +
        "Nếu vừa vượt mốc trong năm thì phải đăng ký với cơ quan thuế <b>trong 30 ngày</b> kể từ ngày cuối kỳ tính thuế có doanh thu luỹ kế chạm mốc.</div></div>");
    } else if (tt.chamNguongHDDT) {
      ra.push('<div class="canh-bao cam"><div><b>Đã chạm mốc hoá đơn điện tử.</b> Doanh thu năm đang đúng ' + ct(tt.nguongHDDT) +
        " — trên mốc này là bắt buộc dùng hoá đơn điện tử, và mốc vừa chạm là căn cứ để đăng ký <b>trong 30 ngày</b> kể từ ngày cuối kỳ tính thuế.</div></div>");
    } else if (tt.phanTramHDDT > 80) {
      ra.push('<div class="canh-bao cam"><div><b>Sắp tới mốc hoá đơn điện tử.</b> Chỉ còn ' + ct(tt.conLaiToiHDDT) +
        " nữa là vượt mốc " + ct(tt.nguongHDDT) + "/năm — vượt mốc là phải dùng hoá đơn điện tử. Nên chuẩn bị trước.</div></div>");
    }
    if (tt.vuotMienThue) {
      ra.push('<div class="canh-bao cam"><div><b>Đã vượt mốc miễn thuế ' + ct(tt.nguongMienThue) + ".</b> " +
        "Hộ phải <b>khai và nộp GTGT, TNCN kể từ quý phát sinh</b> doanh thu trên ngưỡng trong năm " + y + ".</div></div>");
    } else if (tt.phanTramMienThue > 80) {
      ra.push('<div class="canh-bao info"><div><b>Sắp chạm mốc miễn thuế.</b> Còn ' + ct(tt.conLaiToiMienThue) +
        " là tới " + ct(tt.nguongMienThue) + "/năm. Vượt qua là phải khai, nộp thuế ngay trong năm.</div></div>");
    } else {
      ra.push('<div class="canh-bao luc"><div>Doanh thu năm ' + y + " đang <b>trong mức " + ct(tt.nguongMienThue) +
        "/năm trở xuống</b>: chưa phải nộp GTGT và TNCN, nhưng vẫn phải <b>thông báo doanh thu thực tế</b> cho cơ quan thuế.</div></div>");
    }
    $("khoi-canh-bao").innerHTML = ra.join("");
  }

  function veViecPhaiLam(tt, cd, y, tong) {
    var hn = T.homNay();
    var viec = [];

    if (tt.vuotMienThue) {
      viec.push({
        xong: false,
        ten: "Khai thuế GTGT và TNCN theo quý (tờ khai mẫu 01/CNKD)",
        phu: "Hạn nộp hồ sơ: ngày cuối cùng của tháng đầu quý sau (xem bảng quý ở trên). Nộp tiền thuế cùng hạn này.",
        tt: "Chưa xong"
      });
      viec.push({
        xong: false,
        ten: "Nộp tiền thuế đúng hạn đã khai",
        phu: "Nộp tiền cùng hạn nộp hồ sơ khai thuế.",
        tt: "Chưa xong"
      });
      viec.push({
        xong: false,
        ten: "Giữ hoá đơn, chứng từ chi phí",
        phu: "Chi phí chỉ được trừ khi có hoá đơn, chứng từ; khoản chi từ 05 triệu đồng trở lên phải có chứng từ thanh toán không dùng tiền mặt.",
        tt: "Cần làm"
      });
    } else {
      viec.push({
        xong: false,
        ten: "Thông báo doanh thu thực tế của năm với cơ quan thuế",
        phu: "Chậm nhất ngày 31/01 năm sau. Doanh thu năm " + y + " tới nay: " + ct(tt.doanhThu) + ".",
        tt: "Chưa xong"
      });
    }

    var cach = T.cachTNCN(tt.doanhThu, tt.nguongMienThue);
    viec.push({
      xong: cach.ma === "mien",
      ten: "Thuế TNCN: " + cach.ten,
      phu: cach.phu,
      tt: cach.ma === "mien" ? "Không phải nộp" : cach.ma === "lua-chon" ? "Xem xét chọn" : "Bắt buộc"
    });

    viec.push({
      xong: true,
      ten: "Lệ phí môn bài",
      phu: "Từ 01/01/2026 hộ kinh doanh không phải nộp lệ phí môn bài.",
      tt: "Không phải nộp"
    });

    viec.push({
      xong: false,
      ten: "Ghi sổ doanh thu hằng ngày",
      phu: "Sổ phải khớp với số đã khai. Ứng dụng này chính là sổ đó — nên xuất CSV lưu theo tháng.",
      tt: "Đang làm"
    });

    viec.push({
      xong: tt.batBuocHDDT ? false : true,
      ten: "Hoá đơn điện tử",
      phu: tt.batBuocHDDT
        ? "Doanh thu năm đã vượt " + ct(tt.nguongHDDT) + " — bắt buộc dùng hoá đơn điện tử; đăng ký trong 30 ngày kể từ ngày cuối kỳ tính thuế chạm mốc."
        : tt.chamNguongHDDT
          ? "Doanh thu năm đang đúng " + ct(tt.nguongHDDT) + " — đây là mốc để đăng ký hoá đơn điện tử trong 30 ngày."
          : "Chưa bắt buộc (chỉ bắt buộc khi doanh thu năm trên " + ct(tt.nguongHDDT) + "). Có thể đăng ký trước nếu cần.",
      tt: tt.batBuocHDDT ? "Bắt buộc" : tt.chamNguongHDDT ? "Đã chạm mốc" : "Chưa bắt buộc"
    });

    viec.push({
      xong: false,
      ten: "Khai thuế bằng phương thức điện tử",
      phu: "Hồ sơ khai thuế nộp qua cổng dịch vụ công của cơ quan thuế; chỉ nộp giấy khi thuộc trường hợp đặc biệt.",
      tt: "Cần làm"
    });

    $("th-viec").innerHTML = viec.map(function (v) {
      return '<div class="hang" style="align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--vien)">' +
        '<div style="flex:1"><div class="dam">' + esc(v.ten) + "</div>" +
        '<div class="nho" style="margin-top:2px">' + esc(v.phu) + "</div></div>" +
        '<span class="badge ' + (v.xong ? "xong" : "sap") + '">' + esc(v.tt) + "</span></div>";
    }).join("");
  }

  /* ================= MÀN CÀI ĐẶT ================= */

  var PHAP_LY = [
    {
      t: "Nghị định 68/2026/NĐ-CP (ban hành 05/3/2026, hiệu lực 05/3/2026)",
      d: "Quy định về thuế GTGT và thuế TNCN đối với hộ kinh doanh, cá nhân kinh doanh (mức ngưỡng đã theo Nghị định 141/2026/NĐ-CP).",
      y: [
        "Doanh thu cả năm từ 01 tỷ đồng trở xuống: không chịu thuế GTGT và không phải nộp thuế TNCN.",
        "Doanh thu trên 01 tỷ đồng/năm: phải khai và nộp thuế. Thuế GTGT = doanh thu × tỷ lệ % theo ngành.",
        "Thuế TNCN: từ trên 01 tỷ đến 03 tỷ đồng được chọn một trong hai cách — thuế suất × doanh thu tính thuế, hoặc thu nhập tính thuế × thuế suất (chọn cách thứ hai thì phải giữ ổn định 02 năm liên tục); trên 03 tỷ đồng thì tính theo thu nhập tính thuế.",
        "Doanh thu tính thuế của hoạt động vận tải hành khách là toàn bộ doanh thu vận chuyển phát sinh trong kỳ.",
        "Chi phí chỉ được trừ khi có hoá đơn, chứng từ; khoản chi từ 05 triệu đồng trở lên phải có chứng từ thanh toán không dùng tiền mặt.",
        "Khai thuế GTGT theo quý khi doanh thu năm từ 50 tỷ đồng trở xuống (hạn: ngày cuối cùng của tháng đầu quý tiếp theo); trên 50 tỷ đồng thì khai theo tháng (hạn ngày 20 tháng sau).",
        "Hộ kinh doanh phải thông báo doanh thu thực tế của năm với cơ quan thuế, chậm nhất ngày 31/01 năm sau.",
        "Hoá đơn điện tử: doanh thu năm trên 01 tỷ đồng thì bắt buộc dùng hoá đơn điện tử có mã của cơ quan thuế hoặc hoá đơn điện tử khởi tạo từ máy tính tiền có kết nối với cơ quan thuế, và phải đăng ký trong 30 ngày kể từ ngày cuối kỳ tính thuế có doanh thu luỹ kế chạm mốc; dưới mốc này không bắt buộc, được đăng ký nếu có nhu cầu."
      ]
    },
    {
      t: "Nghị định 141/2026/NĐ-CP (ban hành 29/4/2026, hiệu lực từ 01/01/2026)",
      d: "Sửa đổi Nghị định 68/2026/NĐ-CP về ngưỡng doanh thu và hoá đơn điện tử.",
      y: [
        "Nâng ngưỡng không chịu thuế GTGT và không phải nộp TNCN từ 500 triệu đồng/năm lên 01 tỷ đồng/năm.",
        "Ngưỡng bắt buộc dùng hoá đơn điện tử: doanh thu năm trên 01 tỷ đồng.",
        "Vì vậy ứng dụng để mặc định cả hai ngưỡng là 01 tỷ đồng; Sếp sửa được ở màn Cài đặt nếu quy định thay đổi.",
        "Việc xử lý thuế đã nộp của các kỳ trước theo mức ngưỡng cũ (500 triệu) cần hỏi trực tiếp cơ quan thuế — ứng dụng không tính phần này."
      ]
    },
    {
      t: "Thông tư 18/2026/TT-BTC và các văn bản hướng dẫn sửa đổi (50/2026/TT-BTC, 89/2026/TT-BTC)",
      d: "Mẫu tờ khai, sổ sách và biểu mẫu kê khai của hộ kinh doanh.",
      y: [
        "Tờ khai thuế của hộ kinh doanh: mẫu 01/CNKD (thông tư 18/2026/TT-BTC).",
        "Một số mẫu biểu đã được sửa đổi bởi các thông tư sau; trước khi nộp Sếp lấy mẫu hiện hành từ cơ quan thuế hoặc cổng thông tin thuế điện tử.",
        "Nghị định về hoá đơn điện tử (254/2026/NĐ-CP) quy định chi tiết việc dùng hoá đơn điện tử của hộ kinh doanh.",
        "Ứng dụng không in tờ khai và không nộp thay; chỉ tính con số ước tính để Sếp đối chiếu khi kê khai."
      ]
    },
    {
      t: "Nghị quyết 198/2025/QH15 và Luật Thuế TNCN 109/2025/QH15",
      d: "Bỏ phương pháp khoán và quy định thuế suất theo thu nhập tính thuế.",
      y: [
        "Từ 01/01/2026 không còn phương pháp khoán: hộ kinh doanh khai theo doanh thu thực tế.",
        "Bậc thuế suất theo thu nhập tính thuế (khoản 2 Điều 7 Luật Thuế TNCN 109/2025/QH15) được ứng dụng nêu để tham khảo, không dùng để tính con số phải nộp."
      ]
    },
    {
      t: "Không còn lệ phí môn bài",
      d: "Từ 01/01/2026, hộ kinh doanh không phải nộp lệ phí môn bài.",
      y: []
    },
    {
      t: "Cần Sếp đối chiếu lại ở cơ quan thuế",
      d: "Ứng dụng để Sếp tự cài, không cứng nhắc con số nào — mọi số liệu trong ứng dụng là ước tính.",
      y: [
        "Tỷ lệ % theo ngành áp cho vận tải hành khách (đang để mặc định GTGT 3% và TNCN 1,5%): đối chiếu phụ lục tỷ lệ của Nghị định 68/2026/NĐ-CP hoặc hỏi trực tiếp cơ quan thuế nơi đăng ký.",
        "Cách tính TNCN Sếp chọn cho vùng doanh thu trên 01 tỷ đến 03 tỷ đồng, và thủ tục đăng ký cách chọn đó.",
        "Số hiệu, hiệu lực và mẫu biểu hiện hành của các thông tư, nghị định sửa đổi nêu trên.",
        "Hồ sơ, giấy phép kinh doanh vận tải và các nghĩa vụ riêng của ngành taxi."
      ]
    }
  ];

  function htmlPhapLy(day) {
    return PHAP_LY.map(function (m) {
      return '<div style="margin-bottom:14px"><div class="dam">' + esc(m.t) + "</div>" +
        '<div class="nho" style="margin:2px 0 6px">' + esc(m.d) + "</div>" +
        (day
          ? m.y.map(function (x) {
              return '<div class="nho" style="padding-left:12px;position:relative;margin-bottom:4px">' +
                '<span style="position:absolute;left:0">•</span>' + esc(x) + "</div>";
            }).join("")
          : "") +
        "</div>";
    }).join("");
  }

  function veCaiDat() {
    var cd = caiDat();
    $("cd-ten").value = cd.tenHo;
    $("cd-mst").value = cd.mst;
    $("cd-dia-chi").value = cd.diaChi;
    $("cd-nguong").value = T.dinhDangNhap(String(cd.nguongMienThue));
    $("cd-nguong-hddt").value = T.dinhDangNhap(String(cd.nguongHDDT));
    $("cd-tyle-gtgt").value = String(cd.tyLeGTGT).replace(".", ",");
    $("cd-tyle-tncn").value = String(cd.tyLeTNCN).replace(".", ",");
    $("cd-phap-ly").innerHTML = htmlPhapLy(false);
    $("pl-noi-dung").innerHTML = htmlPhapLy(true);
    $("cd-ngay-tao").textContent = "cập nhật " + new Date().toLocaleDateString("vi-VN");
    kiemTraLuuTru();
  }

  function luuCaiDat() {
    var gtgt = Number(String($("cd-tyle-gtgt").value).replace(",", ".").replace(/[^\d.]/g, ""));
    var tncn = Number(String($("cd-tyle-tncn").value).replace(",", ".").replace(/[^\d.]/g, ""));
    dl.settings.tenHo = $("cd-ten").value.trim();
    dl.settings.mst = $("cd-mst").value.trim();
    dl.settings.diaChi = $("cd-dia-chi").value.trim();
    dl.settings.nguongMienThue = T.docSoTien($("cd-nguong").value);
    dl.settings.nguongHDDT = T.docSoTien($("cd-nguong-hddt").value);
    dl.settings.tyLeGTGT = isFinite(gtgt) && gtgt >= 0 ? gtgt : T.MAC_DINH.tyLeGTGT;
    dl.settings.tyLeTNCN = isFinite(tncn) && tncn >= 0 ? tncn : T.MAC_DINH.tyLeTNCN;
    luu();
    veCaiDat();
    capNhatTieuDe();
    bao("Đã lưu cài đặt");
  }

  function capNhatTieuDe() {
    var ten = dl.settings.tenHo || "Sổ doanh thu";
    $("ten-ung-dung").textContent = ten;
    document.title = ten;
  }

  function khoiTaoNgay() {
    var hn = T.homNay();
    $("o-ngay").value = hn;
    $("o-gio").value = gioHienTai();
    $("o-ngay").max = hn;
    thangDangXem = thangMacDinh();
  }

  /* ================= GẮN SỰ KIỆN ================= */

  function ganSuKien() {
    /* tab dưới */
    var nut = document.querySelectorAll("nav.tab-duoi button");
    for (var i = 0; i < nut.length; i++) {
      nut[i].addEventListener("click", function () { moMan(this.getAttribute("data-man")); });
    }

    /* ô tiền */
    var oTien = $("o-tien");
    oTien.addEventListener("input", function () {
      var vt = this.selectionStart;
      var truoc = this.value.length;
      this.value = T.dinhDangNhap(this.value);
      var lech = this.value.length - truoc;
      try { this.setSelectionRange(vt + lech, vt + lech); } catch (e) { /* bỏ qua */ }
      veGoiY();
    });

    var chip = document.querySelectorAll(".chip[data-cong]");
    for (var c = 0; c < chip.length; c++) {
      chip[c].addEventListener("click", function () {
        var them = Number(this.getAttribute("data-cong"));
        var tong = T.docSoTien(oTien.value) + them;
        oTien.value = T.dinhDangNhap(String(tong));
        veGoiY();
      });
    }
    $("nut-xoa-tien").addEventListener("click", function () {
      oTien.value = "";
      veGoiY();
      oTien.focus();
    });

    /* hình thức */
    var nutHinh = document.querySelectorAll("#chon-hinh button");
    for (var h = 0; h < nutHinh.length; h++) {
      nutHinh[h].addEventListener("click", function () { datHinh(this.getAttribute("data-hinh")); });
    }

    $("nut-luu").addEventListener("click", luuKhoanThu);

    /* sổ */
    $("o-thang").addEventListener("change", function () {
      if (this.value) { thangDangXem = this.value; veSo(); }
    });
    $("o-loc-hinh").addEventListener("change", veSo);
    $("nut-csv-thang").addEventListener("click", function () {
      var ds = dsThangNay();
      if (!ds.length) { bao("Tháng này chưa có dữ liệu"); return; }
      xuatCSV(ds, "so-doanh-thu-" + thangDangXem + ".csv");
    });

    /* thuế */
    $("o-nam").addEventListener("change", function () {
      namDangXem = parseInt(this.value, 10);
      veThue();
    });
    $("nut-nam-nay").addEventListener("click", function () {
      namDangXem = T.tachNgay(T.homNay()).y;
      veThue();
    });

    /* cài đặt */
    $("nut-luu-cd").addEventListener("click", luuCaiDat);
    $("cd-mac-dinh-van-tai").addEventListener("click", function () {
      $("cd-tyle-gtgt").value = "3";
      $("cd-tyle-tncn").value = "1,5";
      $("cd-nguong").value = T.dinhDangNhap("1000000000");
      $("cd-nguong-hddt").value = T.dinhDangNhap("1000000000");
      bao("Đã điền số mặc định — bấm Lưu cài đặt");
    });
    ["cd-nguong", "cd-nguong-hddt"].forEach(function (id) {
      $(id).addEventListener("input", function () { this.value = T.dinhDangNhap(this.value); });
    });

    $("nut-xuat-json").addEventListener("click", function () {
      var ten = "sao-luu-so-doanh-thu-" + T.homNay() + ".json";
      var ok = S.taiTep(ten, S.xuatJSON(dl));
      bao(ok ? "Đã tạo tệp sao lưu" : "Trình duyệt không cho tải tệp");
    });

    $("nut-nhap-json").addEventListener("click", function () { $("o-tep").click(); });
    $("o-tep").addEventListener("change", function () {
      var tep = this.files && this.files[0];
      if (!tep) return;
      var doc = new FileReader();
      doc.onload = function () {
        try {
          var moi = S.nhapJSON(String(doc.result));
          if (!window.confirm("Phục hồi " + moi.transactions.length + " giao dịch từ tệp? Dữ liệu hiện có sẽ bị thay bằng dữ liệu trong tệp.")) return;
          dl = moi;
          luu();
          capNhatTieuDe();
          khoiTaoNgay();
          veTatCa();
          bao("Đã phục hồi " + moi.transactions.length + " giao dịch");
        } catch (e) {
          window.alert("Không đọc được tệp: " + e.message);
        }
      };
      doc.readAsText(tep);
      this.value = "";
    });

    $("nut-xuat-csv").addEventListener("click", function () {
      if (!dl.transactions.length) { bao("Chưa có dữ liệu"); return; }
      xuatCSV(dl.transactions, "so-doanh-thu-tat-ca.csv");
    });

    $("nut-xoa-het").addEventListener("click", function () {
      if (!window.confirm("Xoá TOÀN BỘ dữ liệu (" + dl.transactions.length + " giao dịch)? Không khôi phục được.")) return;
      if (!window.confirm("Chắc chắn xoá? Hãy chắc rằng Sếp đã sao lưu ra tệp.")) return;
      dl = S.xoaHet();
      luu();
      capNhatTieuDe();
      khoiTaoNgay();
      veTatCa();
      bao("Đã xoá toàn bộ dữ liệu");
    });

    $("nut-xem-phap-ly").addEventListener("click", function () { moMan("phaply"); });
    $("nut-dong-phap-ly").addEventListener("click", function () { moMan("cd"); });

    $("che").addEventListener("click", function (e) { if (e.target === this) dongTam(); });
  }

  function veTatCa() {
    veGoiMan();
    veSo();
    veThue();
    veCaiDat();
    kiemTraLuuTru();
  }

  /* ================= KHỞI ĐỘNG ================= */

  function batDau() {
    dl = S.doc();
    capNhatTieuDe();
    khoiTaoNgay();
    ganSuKien();
    datHinh("cash");
    veGoiY();
    veTatCa();
    moMan("ghi");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", batDau);
  } else {
    batDau();
  }
})();
