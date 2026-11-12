/* store.js — nơi lưu dữ liệu.
   Ưu tiên localStorage. Trên iOS, mở trang bằng file:// có thể bị chặn lưu:
   khi đó tự chuyển sang bộ nhớ tạm và bật cờ "tamThoi" để app nhắc sao lưu. */
(function (root) {
  "use strict";

  var KHOA = "hkd-doanh-thu-v1";
  var PHIEN_BAN = 1;

  var boNhoTam = null;
  var dungTam = false;
  var loiLuu = "";

  function thuLocalStorage() {
    try {
      var ls = root.localStorage;
      if (!ls) return false;
      var k = KHOA + "-thu";
      ls.setItem(k, "1");
      var ok = ls.getItem(k) === "1";
      ls.removeItem(k);
      return ok;
    } catch (e) {
      return false;
    }
  }

  var coLocalStorage = thuLocalStorage();

  function rong() {
    return { version: PHIEN_BAN, settings: {}, transactions: [] };
  }

  function chuanHoa(dl) {
    var ra = rong();
    if (!dl || typeof dl !== "object") return ra;
    var cd = dl.settings;
    if (cd && typeof cd === "object") {
      Object.keys(cd).forEach(function (k) {
        if (cd[k] !== null && cd[k] !== undefined && cd[k] !== "") ra.settings[k] = cd[k];
      });
    }
    var ds = dl.transactions;
    if (Object.prototype.toString.call(ds) === "[object Array]") {
      ra.transactions = ds.filter(function (g) {
        return g && typeof g === "object" && g.date;
      }).map(function (g) {
        return {
          id: String(g.id || taoId()),
          date: String(g.date),
          time: g.time ? String(g.time) : "",
          amount: Math.round(Number(g.amount) || 0),
          method: g.method === "transfer" ? "transfer" : "cash",
          note: g.note ? String(g.note) : "",
          invoice: g.invoice ? String(g.invoice) : ""
        };
      });
    }
    return ra;
  }

  function taoId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function doc() {
    if (dungTam) return chuanHoa(boNhoTam);
    if (!coLocalStorage) {
      dungTam = true;
      if (!boNhoTam) boNhoTam = rong();
      return chuanHoa(boNhoTam);
    }
    try {
      var tho = root.localStorage.getItem(KHOA);
      if (!tho) return rong();
      return chuanHoa(JSON.parse(tho));
    } catch (e) {
      loiLuu = "Dữ liệu đã lưu bị lỗi đọc: " + e.message;
      return rong();
    }
  }

  function ghi(dl) {
    var sach = chuanHoa(dl);
    if (dungTam || !coLocalStorage) {
      dungTam = true;
      boNhoTam = sach;
      return { ok: false, tamThoi: true, loi: "Trình duyệt không cho lưu lâu dài ở cách mở này." };
    }
    try {
      root.localStorage.setItem(KHOA, JSON.stringify(sach));
      loiLuu = "";
      return { ok: true, tamThoi: false, loi: "" };
    } catch (e) {
      loiLuu = e.message || "Không ghi được";
      dungTam = true;
      boNhoTam = sach;
      return { ok: false, tamThoi: true, loi: loiLuu };
    }
  }

  function xoaHet() {
    boNhoTam = null;
    if (coLocalStorage) {
      try { root.localStorage.removeItem(KHOA); } catch (e) { /* bỏ qua */ }
    }
    return rong();
  }

  function xuatJSON(dl) {
    return JSON.stringify(chuanHoa(dl), null, 2);
  }

  function nhapJSON(chuoi) {
    var dl = JSON.parse(chuoi);
    if (!dl || typeof dl !== "object") throw new Error("Tệp không phải dữ liệu của ứng dụng.");
    if (Object.prototype.toString.call(dl.transactions) !== "[object Array]") {
      throw new Error("Tệp thiếu danh sách giao dịch.");
    }
    return chuanHoa(dl);
  }

  function taiTep(ten, noiDung, kieu) {
    try {
      var blob = new Blob([noiDung], { type: kieu || "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = ten;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (e) {
      return false;
    }
  }

  root.Store = {
    KHOA: KHOA,
    doc: doc,
    ghi: ghi,
    xoaHet: xoaHet,
    xuatJSON: xuatJSON,
    nhapJSON: nhapJSON,
    taiTep: taiTep,
    taoId: taoId,
    chuanHoa: chuanHoa,
    trangThai: function () {
      return { coLocalStorage: coLocalStorage, dungTam: dungTam, loi: loiLuu };
    }
  };
})(typeof self !== "undefined" ? self : this);
