/* Pembuat PDF laporan pengeluaran.
   Dipakai index.html lewat window.buildLaporanPdf(jsPDF, data) setelah jsPDF dan autoTable dimuat. */
(function (root) {
  'use strict';

  var PAL = [[36, 89, 184], [190, 120, 0], [27, 116, 71], [109, 63, 181], [179, 37, 79], [14, 125, 135]];
  var UMUM = [74, 80, 88];
  var INK = [12, 12, 13];
  var MUTED = [107, 111, 118];
  var LINE = [226, 227, 230];
  var SOFT = [243, 243, 245];
  var ZEBRA = [249, 249, 250];
  var WHITE = [255, 255, 255];
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Font bawaan PDF hanya mengenal huruf Latin, jadi karakter lain dibuang supaya tidak jadi simbol aneh.
  function clean(s) {
    return String(s == null ? '' : s).replace(/[^ -~¡-ÿ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function fmtNum(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { return 'Rp ' + fmtNum(n); }
  function pct(v, total) {
    if (!total) return '0%';
    return (v / total * 100).toFixed(1).replace('.', ',') + '%';
  }
  function fmtDate(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return clean(s);
    return Number(p[2]) + ' ' + BULAN[Number(p[1]) - 1] + ' ' + p[0];
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtStamp(d) {
    return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() + ', ' + pad(d.getHours()) + '.' + pad(d.getMinutes());
  }
  function periodText(from, to) {
    if (from && to) return fmtDate(from) + ' - ' + fmtDate(to);
    if (from) return 'Sejak ' + fmtDate(from);
    if (to) return 'Sampai ' + fmtDate(to);
    return 'Semua tanggal';
  }

  function group(rows, key, order) {
    var map = {}, names = [];
    rows.forEach(function (r) {
      var k = r[key];
      if (!map[k]) { map[k] = { name: k, count: 0, total: 0, rows: [] }; names.push(k); }
      map[k].count++;
      map[k].total += r.jumlah;
      map[k].rows.push(r);
    });
    var list = names.map(function (k) { return map[k]; });
    if (order) {
      list.sort(function (a, b) {
        var ia = order.indexOf(a.name), ib = order.indexOf(b.name);
        if (ia < 0) ia = 999;
        if (ib < 0) ib = 999;
        return ia - ib;
      });
    } else {
      list.sort(function (a, b) { return b.total - a.total; });
    }
    return list;
  }

  function build(JsPDF, d) {
    var doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
    var W = 210, H = 297, M = 14, CW = W - 2 * M, TOPM = 20, BOTM = 18;
    var sec = d.sec || {};
    var vehOrder = (d.vehNames || []).map(clean);

    var rows = (d.rows || []).map(function (r) {
      return {
        tanggal: String(r.tanggal || ''),
        kend: clean(r.kendaraan) || 'Umum',
        kat: clean(r.kategori) || 'Dll',
        ket: clean(r.keterangan),
        lok: clean(r.lokasi),
        oleh: clean(r.oleh),
        jumlah: Number(r.jumlah) || 0,
        ts: String(r.created_at || '')
      };
    });
    rows.sort(function (a, b) {
      if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? -1 : 1;
      return a.ts < b.ts ? -1 : (a.ts > b.ts ? 1 : 0);
    });

    var total = rows.reduce(function (s, r) { return s + r.jumlah; }, 0);
    var byVeh = group(rows, 'kend', vehOrder.concat(['Umum']));
    var byKat = group(rows, 'kat');
    var period = periodText(d.from, d.to);

    function rgbFor(name) {
      if (name === 'Umum') return UMUM;
      var i = vehOrder.indexOf(name);
      return PAL[(i < 0 ? 0 : i) % PAL.length];
    }
    function tc(c) { doc.setTextColor(c[0], c[1], c[2]); }
    function fc(c) { doc.setFillColor(c[0], c[1], c[2]); }
    function dc(c) { doc.setDrawColor(c[0], c[1], c[2]); }
    function font(style, size) { doc.setFont('helvetica', style); doc.setFontSize(size); }

    function table(opts) {
      var cfg = {
        theme: 'striped',
        margin: { top: TOPM, left: M, right: M, bottom: BOTM },
        showFoot: 'lastPage',
        rowPageBreak: 'avoid',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 }, textColor: INK, lineColor: LINE, lineWidth: 0, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: INK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: SOFT, textColor: INK, fontStyle: 'bold' },
        bodyStyles: { fillColor: WHITE },
        alternateRowStyles: { fillColor: ZEBRA }
      };
      var right = opts.right || [], footRight = opts.footRight || [];
      for (var k in opts) { if (k !== 'right' && k !== 'footRight') cfg[k] = opts[k]; }
      // Judul kolom dan baris total ikut rata kanan seperti angkanya.
      cfg.didParseCell = function (c) {
        if (right.indexOf(c.column.index) !== -1) c.cell.styles.halign = 'right';
        if (c.section === 'foot' && footRight.indexOf(c.column.index) !== -1) c.cell.styles.halign = 'right';
      };
      doc.autoTable(cfg);
      return doc.lastAutoTable.finalY;
    }

    function heading(text, y, right) {
      if (y > H - BOTM - 40) { doc.addPage(); y = TOPM; }
      font('bold', 11); tc(INK); doc.text(text, M, y);
      if (right) { font('normal', 8.5); tc(MUTED); doc.text(right, W - M, y, { align: 'right' }); }
      dc(LINE); doc.setLineWidth(0.3); doc.line(M, y + 2, W - M, y + 2);
      return y + 5;
    }
    function vehHeading(g, y) {
      if (y > H - BOTM - 40) { doc.addPage(); y = TOPM; }
      fc(rgbFor(g.name)); doc.rect(M, y - 4.4, 1.8, 6, 'F');
      font('bold', 11); tc(INK); doc.text(g.name === 'Umum' ? 'Umum (semua mobil)' : g.name, M + 4.2, y);
      font('normal', 8.5); tc(MUTED);
      doc.text(g.count + ' catatan  |  ' + rp(g.total), W - M, y, { align: 'right' });
      dc(LINE); doc.setLineWidth(0.3); doc.line(M, y + 2, W - M, y + 2);
      return y + 5;
    }

    /* ---------- Kepala halaman pertama ---------- */
    fc(INK); doc.rect(0, 0, W, 36, 'F');
    font('normal', 8); tc([169, 173, 180]); doc.text('CATATAN PENGELUARAN CNG', M, 13);
    font('bold', 21); tc(WHITE); doc.text('Laporan Pengeluaran', M, 25);
    font('bold', 9.5); tc(WHITE); doc.text(period, W - M, 13, { align: 'right' });
    font('normal', 8); tc([169, 173, 180]); doc.text('Dicetak ' + fmtStamp(d.printedAt || new Date()), W - M, 25, { align: 'right' });

    var y = 44;
    font('normal', 8.5); tc(MUTED);
    doc.text('Mobil: ' + (d.kend ? (d.kend === 'Umum' ? 'Umum (semua mobil)' : clean(d.kend)) : 'Semua') + '      Kategori: ' + (d.kat ? clean(d.kat) : 'Semua'), M, y);
    y += 5;

    var gap = 4, bw = (CW - 2 * gap);
    var widths = [bw * 0.42, bw * 0.29, bw * 0.29];
    var labels = ['TOTAL PENGELUARAN', 'JUMLAH CATATAN', 'RATA-RATA PER CATATAN'];
    var values = [rp(total), String(rows.length), rp(rows.length ? total / rows.length : 0)];
    var x = M;
    for (var i = 0; i < 3; i++) {
      fc(SOFT); doc.roundedRect(x, y, widths[i], 19, 2.5, 2.5, 'F');
      font('normal', 7); tc(MUTED); doc.text(labels[i], x + 4, y + 6.5);
      font('bold', i === 0 ? 15 : 12); tc(INK); doc.text(values[i], x + 4, y + 14.5);
      x += widths[i] + gap;
    }
    y += 27;

    /* ---------- Ringkasan ---------- */
    if (rows.length && sec.ringkas) {
      y = heading('Ringkasan per mobil', y);
      var body = byVeh.map(function (g) {
        return [g.name === 'Umum' ? 'Umum (semua mobil)' : g.name, String(g.count), rp(g.total), pct(g.total, total)];
      });
      y = table({
        startY: y,
        head: [['Mobil', 'Catatan', 'Total', 'Porsi']],
        body: body,
        foot: [['Total', String(rows.length), rp(total), '100%']],
        right: [1, 2, 3],
        columnStyles: { 0: { cellPadding: { top: 2.4, bottom: 2.4, left: 7, right: 2.6 } }, 1: { cellWidth: 24 }, 2: { cellWidth: 42 }, 3: { cellWidth: 24 } },
        didDrawCell: function (c) {
          if (c.section === 'body' && c.column.index === 0) {
            fc(rgbFor(byVeh[c.row.index].name));
            doc.circle(c.cell.x + 3.6, c.cell.y + c.cell.height / 2, 1.2, 'F');
          }
        }
      }) + 9;

      y = heading('Ringkasan per kategori', y);
      y = table({
        startY: y,
        head: [['Kategori', 'Catatan', 'Total', 'Porsi']],
        body: byKat.map(function (g) { return [g.name, String(g.count), rp(g.total), pct(g.total, total)]; }),
        foot: [['Total', String(rows.length), rp(total), '100%']],
        right: [1, 2, 3],
        columnStyles: { 1: { cellWidth: 24 }, 2: { cellWidth: 42 }, 3: { cellWidth: 24 } }
      }) + 9;

      var cols = byVeh.map(function (g) { return g.name; });
      if (cols.length >= 2 && byKat.length >= 1) {
        y = heading('Kategori per mobil', y, 'dalam Rupiah');
        var matrix = byKat.map(function (k) {
          var line = [k.name];
          var sum = 0;
          cols.forEach(function (c) {
            var v = 0;
            k.rows.forEach(function (r) { if (r.kend === c) v += r.jumlah; });
            sum += v;
            line.push(v ? fmtNum(v) : '-');
          });
          line.push(fmtNum(sum));
          return line;
        });
        var foot = ['Total'];
        byVeh.forEach(function (g) { foot.push(fmtNum(g.total)); });
        foot.push(fmtNum(total));
        var cs = {}, rc = [];
        for (var ci = 1; ci <= cols.length + 1; ci++) rc.push(ci);
        cs[cols.length + 1] = { fontStyle: 'bold' };
        y = table({
          startY: y,
          head: [['Kategori'].concat(cols.map(function (c) { return c === 'Umum' ? 'Umum' : c; }), ['Total'])],
          body: matrix,
          foot: [foot],
          styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 2.4, right: 2.4 }, textColor: INK, lineColor: LINE, lineWidth: 0, overflow: 'linebreak', valign: 'middle' },
          right: rc,
          columnStyles: cs
        }) + 9;
      }
    }

    /* ---------- Rincian per mobil ---------- */
    if (rows.length && sec.mobil) {
      byVeh.forEach(function (g) {
        y = vehHeading(g, y);
        y = table({
          startY: y,
          head: [['Tanggal', 'Kategori', 'Keterangan', 'Oleh', 'Jumlah']],
          body: g.rows.map(function (r) {
            return [fmtDate(r.tanggal), r.kat, r.ket + (r.lok ? ' (' + r.lok + ')' : ''), r.oleh, rp(r.jumlah)];
          }),
          foot: [['', '', '', 'Subtotal', rp(g.total)]],
          right: [4],
          footRight: [3, 4],
          columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 30 }, 3: { cellWidth: 24 }, 4: { cellWidth: 30 } }
        }) + 9;
      });
    }

    /* ---------- Semua catatan urut tanggal ---------- */
    if (rows.length && sec.semua) {
      y = heading('Semua catatan (urut tanggal)', y, rows.length + ' catatan');
      y = table({
        startY: y,
        head: [['Tanggal', 'Mobil', 'Kategori', 'Keterangan', 'Oleh', 'Jumlah']],
        body: rows.map(function (r) {
          return [fmtDate(r.tanggal), r.kend, r.kat, r.ket + (r.lok ? ' (' + r.lok + ')' : ''), r.oleh, rp(r.jumlah)];
        }),
        foot: [['', '', '', '', 'Total', rp(total)]],
        styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 2.4, right: 2.4 }, textColor: INK, lineColor: LINE, lineWidth: 0, overflow: 'linebreak', valign: 'middle' },
        right: [5],
        footRight: [4, 5],
        columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 20 }, 2: { cellWidth: 26 }, 4: { cellWidth: 20 }, 5: { cellWidth: 28 } }
      });
    }

    if (!rows.length) {
      font('normal', 10); tc(MUTED);
      doc.text('Tidak ada catatan pada filter ini.', M, y + 4);
    }

    /* ---------- Header lanjutan dan nomor halaman ---------- */
    var n = doc.getNumberOfPages();
    for (var p = 1; p <= n; p++) {
      doc.setPage(p);
      font('normal', 7.5); tc(MUTED);
      dc(LINE); doc.setLineWidth(0.3);
      doc.line(M, H - 12, W - M, H - 12);
      doc.text('Catatan Pengeluaran CNG', M, H - 7.5);
      doc.text('Halaman ' + p + ' dari ' + n, W - M, H - 7.5, { align: 'right' });
      if (p > 1) {
        doc.text('Laporan Pengeluaran  |  ' + period, M, 11);
        doc.line(M, 13.5, W - M, 13.5);
      }
    }
    doc.setProperties({ title: 'Laporan Pengeluaran CNG ' + period, subject: 'Pengeluaran kerja', creator: 'Catatan Pengeluaran CNG' });
    return doc;
  }

  root.buildLaporanPdf = build;
})(typeof window !== 'undefined' ? window : globalThis);
