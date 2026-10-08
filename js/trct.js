/* Extrai dados do Termo de Rescisão do Contrato de Trabalho (TRCT) em PDF.
 * Funciona com PDFs que têm texto (gerados pelo sistema de folha). PDFs escaneados/fotos não têm texto. */
(function (root) {
  'use strict';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

  function carregarPdfJs() {
    if (root.pdfjsLib) return Promise.resolve(root.pdfjsLib);
    return new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () { root.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(root.pdfjsLib); };
      s.onerror = function () { erro(new Error('não foi possível carregar o leitor de PDF')); };
      document.head.appendChild(s);
    });
  }

  // Lê todos os textos com posição (topo da página = 0)
  async function itensDoPdf(bytes, pdfjs) {
    var doc = await pdfjs.getDocument({ data: bytes }).promise;
    var itens = [], off = 0;
    for (var n = 1; n <= Math.min(doc.numPages, 3); n++) {
      var pg = await doc.getPage(n);
      var vp = pg.getViewport({ scale: 1 });
      var tc = await pg.getTextContent();
      tc.items.forEach(function (it) {
        var str = (it.str || '').replace(/\s+/g, ' ').trim();
        if (!str) return;
        var x = it.transform[4], y = vp.height - it.transform[5];
        itens.push({ s: str, x: x, y: y + off, w: it.width || str.length * 4 });
      });
      off += vp.height + 50;
    }
    return itens;
  }

  var RE_DATA = /\b(\d{2}\/\d{2}\/\d{4})\b/;
  var RE_CPF = /\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/;

  function analisar(itens) {
    var r = {};
    itens.sort(function (a, b) { return a.y - b.y || a.x - b.x; });

    // início do bloco do trabalhador (para não confundir com o empregador)
    var ini = 0;
    itens.forEach(function (it) { if (!ini && /IDENTIFICA[ÇC][ÃA]O\s+DO\s+TRABALHADOR|^TRABALHADOR$/i.test(it.s)) ini = it.y; });
    var trab = itens.filter(function (it) { return it.y >= ini - 2; });

    function rotulo(re, lista) { return (lista || trab).filter(function (it) { return re.test(it.s); })[0]; }

    // valor do campo: o texto logo abaixo do rótulo (ou à direita, na mesma linha)
    function valor(lab, padrao) {
      if (!lab) return '';
      var cand = itens.filter(function (it) {
        if (it === lab) return false;
        var dy = it.y - lab.y, dx = it.x - lab.x;
        var abaixo = dy > 2 && dy < 26 && dx > -20 && dx < 220;
        var direita = Math.abs(dy) <= 2 && dx > lab.w - 2 && dx < lab.w + 260;
        if (!(abaixo || direita)) return false;
        if (/^\d{1,3}\s+[A-ZÀ-Ú]/i.test(it.s) && !padrao) return false; // outro rótulo numerado
        return padrao ? padrao.test(it.s) : true;
      });
      cand.sort(function (a, b) {
        var pa = Math.abs(a.y - lab.y) * 3 + Math.abs(a.x - lab.x), pb = Math.abs(b.y - lab.y) * 3 + Math.abs(b.x - lab.x);
        return pa - pb;
      });
      var v = cand[0] ? cand[0].s : '';
      if (padrao) { var m = padrao.exec(lab.s) || padrao.exec(v); return m ? (m[1] || m[0]) : ''; }
      return v;
    }

    var tudo = trab.map(function (i) { return i.s; }).join(' | ');

    // CPF do trabalhador
    var labCpf = rotulo(/\bCPF\b/i);
    r.cpf = valor(labCpf, RE_CPF) || ((RE_CPF.exec(tudo) || [])[1] || '');

    // Nome
    var labNome = rotulo(/^(11\s*)?Nome(\s+do\s+Trabalhador)?:?$/i) || rotulo(/^11\s+Nome\b/i);
    r.nome = valor(labNome).replace(/^nome:?\s*/i, '');
    if (/^\d|CPF|PIS/i.test(r.nome)) r.nome = '';

    // Endereço
    var labEnd = rotulo(/^(12\s*)?Endere[çc]o/i);
    var end = valor(labEnd);
    var bairro = valor(rotulo(/^(13\s*)?Bairro/i));
    var mun = valor(rotulo(/^(14\s*)?Munic[íi]pio/i));
    var uf = valor(rotulo(/^(15\s*)?UF$/i));
    var cep = valor(rotulo(/^(16\s*)?CEP/i), /(\d{5}-?\d{3})/);
    var partes = [end, bairro, mun && (mun + (uf ? '/' + uf : '')), cep && ('CEP ' + cep)].filter(function (x) { return x && !/^\d{1,2}\s/.test(x); });
    r.endereco = partes.join(' - ');

    // Datas
    r.admissao = valor(rotulo(/Data\s+de\s+Admiss[ãa]o/i, itens), RE_DATA) || ((/Admiss[ãa]o[^|]{0,30}\|?\s*(\d{2}\/\d{2}\/\d{4})/i.exec(tudo) || [])[1] || '');
    r.afastamento = valor(rotulo(/Data\s+(de|do)\s+Afastamento/i, itens), RE_DATA) || ((/Afastamento[^|]{0,30}\|?\s*(\d{2}\/\d{2}\/\d{4})/i.exec(tudo) || [])[1] || '');

    // Causa do afastamento
    r.causa = valor(rotulo(/Causa\s+do\s+Afastamento/i, itens));
    r.codigo = valor(rotulo(/C[óo]d(igo|\.)?\s+(de\s+|do\s+)?Afastamento/i, itens), /\b([A-Z]{2}\d)\b/);
    // Motivo conforme as opções da pergunta 3 do termo da Unimed Inconfidentes
    var c = (r.causa + ' ' + r.codigo).toLowerCase();
    if (/aposentad/.test(c)) r.motivo = 'aposentadoria';
    else if (/exonera/.test(c)) r.motivo = 'exoneracao';
    else if (/pedido|a pedido|iniciativa do empregado|\bsj1\b|\bra1\b/.test(c)) r.motivo = 'pedido';
    else if (/sem justa causa/.test(c) || /\bsj2\b/.test(c)) r.motivo = 'semJusta';
    else if (r.causa) r.motivo = 'outros';

    if (r.admissao && r.afastamento) {
      var a = r.admissao.split('/'), b = r.afastamento.split('/');
      var meses = (+b[2] - +a[2]) * 12 + (+b[1] - +a[1]) - (+b[0] < +a[0] ? 1 : 0);
      if (meses >= 0) r.meses = meses;
    }
    return r;
  }

  async function extrair(bytes) {
    var pdfjs = await carregarPdfJs();
    var itens = await itensDoPdf(bytes, pdfjs);
    if (itens.length < 10) return { semTexto: true };
    return analisar(itens);
  }

  var api = { extrair: extrair, analisar: analisar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TRCT = api;
})(typeof window !== 'undefined' ? window : globalThis);
