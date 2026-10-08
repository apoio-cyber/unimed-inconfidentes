/* Preenche o "Termo de comunicação de exclusão de beneficiário" (AN.VEN.COM.008) da Unimed Inconfidentes.
 * Coordenadas em pontos (A4), origem no topo da página, medidas no modelo modelos/termo-exclusao.pdf. */
(function (root) {
  'use strict';
  var MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

  // caixas de marcação: canto superior esquerdo (quadrado de 9,6 pt)
  var CX = {
    q1: { S: [79.2, 295.0], N: [123.0, 295.0] },
    q3: { semJusta: [79.2, 395.2], exoneracao: [366.6, 395.2], pedido: [77.5, 415.9], aposentadoria: [355.8, 415.9], outros: [77.5, 436.6] },
    q4: { S: [79.2, 495.4], N: [125.8, 495.4] },
    q5: { S: [79.2, 528.8], N: [123.0, 528.8] }
  };

  function limpar(s) { return String(s == null ? '' : s).replace(/[–—]/g, '-').replace(/[^\x20-\x7E\xA0-\xFF]/g, ''); }

  async function gerar(opts) {
    var L = opts.PDFLib, d = opts.dados;
    var doc = await L.PDFDocument.load(opts.modelo);
    var font = await doc.embedFont(L.StandardFonts.Helvetica);
    var bold = await doc.embedFont(L.StandardFonts.HelveticaBold);
    var p = doc.getPage(0), H = p.getHeight(), cor = L.rgb(0, 0, 0);

    function T(txt, x, base, size, maxW, f, center) {
      txt = limpar(txt); if (!txt) return;
      f = f || font; size = size || 10;
      var w = f.widthOfTextAtSize(txt, size);
      while (maxW && w > maxW && size > 6) { size -= 0.25; w = f.widthOfTextAtSize(txt, size); }
      p.drawText(txt, { x: center ? x - w / 2 : x, y: H - base, size: size, font: f, color: cor });
    }
    function X(pos) { if (!pos) return; T('X', pos[0] + 4.8, pos[1] + 8.3, 10, null, bold, true); }

    T(d.nome, 104.5, 208.0, 10, 448);
    T(d.cpf, 68, 228.7, 10, 200);
    T(d.endereco, 94, 249.5, 10, 458);
    T(d.telefone, 165, 270.2, 10, 200);

    X(CX.q1.N);                       // 1 - sempre "Não"
    X(CX.q3[d.motivo]);               // 3 - motivo
    if (d.motivo === 'outros') T(d.motivoOutros, 130, 445.8, 10, 425);
    X(CX.q4.N);                       // 4 - sempre "Não"
    X(CX.q5.N);                       // 5 - sempre "Não"

    // Ouro Preto, DD de MÊS de AAAA (data do preenchimento)
    var hoje = d.data || new Date();
    T(('0' + hoje.getDate()).slice(-2), 121.7, 684.6, 10, 40, null, true);
    T(MESES[hoje.getMonth()], 221.5, 684.6, 10, 118, null, true);
    T(String(hoje.getFullYear()), 326, 684.6, 10, 52, null, true);

    doc.setTitle('Termo de exclusão Unimed - ' + limpar(d.nome));
    return await doc.save();
  }

  var api = { gerar: gerar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Termo = api;
})(typeof window !== 'undefined' ? window : globalThis);
