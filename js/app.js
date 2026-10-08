(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function so(v) { return (v || '').replace(/\D/g, ''); }
  function radio(n) { var r = $('input[name="' + n + '"]:checked'); return r ? r.value : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cpfValido(c) {
    c = so(c); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if (((10 * s) % 11) % 10 !== +c[t]) return false; }
    return true;
  }

  var hoje = new Date();
  $('#dataHoje').textContent = ('0' + hoje.getDate()).slice(-2) + ' de ' + MESES[hoje.getMonth()].toUpperCase() + ' de ' + hoje.getFullYear();

  // máscaras
  function mascara(el, tipo) {
    var d = so(el.value);
    if (tipo === 'cpf') {
      d = d.slice(0, 11);
      el.value = d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    } else if (tipo === 'tel') {
      d = d.slice(0, 11);
      if (d.length <= 2) el.value = d ? '(' + d : '';
      else if (d.length <= 6) el.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      else if (d.length <= 10) el.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      else el.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    }
  }
  $$('[data-mask]').forEach(function (el) { el.addEventListener('input', function () { mascara(el, el.dataset.mask); }); });

  $$('input[name=motivo]').forEach(function (r) {
    r.addEventListener('change', function () { $('#outrosBox').hidden = radio('motivo') !== 'outros'; });
  });
  $$('input').forEach(function (el) { el.addEventListener('input', function () { el.classList.remove('auto'); }); });

  // ---------- TRCT ----------
  $('#trct').onchange = async function (e) {
    var f = e.target.files[0], st = $('#trctStatus');
    if (!f) { st.textContent = ''; return; }
    if (!(/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name))) {
      st.innerHTML = 'Arquivo de imagem: <b>não é possível ler os dados de uma foto</b> — preencha os campos manualmente.'; return;
    }
    st.textContent = 'Lendo o TRCT…';
    try {
      var r = await TRCT.extrair(new Uint8Array(await f.arrayBuffer()));
      if (r.semTexto) { st.innerHTML = 'O PDF parece escaneado (sem texto). <b>Preencha os campos manualmente.</b>'; return; }
      var achou = [];
      function pre(sel, v, nome) { if (v) { $(sel).value = v; $(sel).classList.add('auto'); achou.push(nome); } }
      pre('#nome', (r.nome || '').toUpperCase(), 'nome');
      if (r.cpf) { pre('#cpf', r.cpf, 'CPF'); }
      pre('#endereco', (r.endereco || '').toUpperCase(), 'endereço');
      if (r.motivo) {
        var rb = $('input[name=motivo][value="' + r.motivo + '"]');
        rb.checked = true; rb.dispatchEvent(new Event('change'));
        if (r.motivo === 'outros') $('#motivoOutros').value = (r.causa || '').slice(0, 80);
        achou.push('motivo');
      }
      st.innerHTML = (achou.length
        ? 'Dados lidos do TRCT: <b>' + esc(achou.join(', ')) + '</b>. Confira os campos destacados em amarelo.'
        : 'Não consegui identificar os dados neste TRCT. Preencha manualmente.')
        + (r.causa ? '<br>Causa no TRCT: ' + esc(r.causa) + (r.codigo ? ' (' + esc(r.codigo) + ')' : '') : '')
        + '<br>O telefone não consta no TRCT: informe manualmente.';
    } catch (err) {
      console.error(err);
      st.textContent = 'Não foi possível ler o TRCT (' + err.message + '). Preencha manualmente.';
    }
  };

  // ---------- validação ----------
  function validar() {
    var erros = [];
    $$('.invalido').forEach(function (x) { x.classList.remove('invalido'); });
    function marca(sel) { $(sel).classList.add('invalido'); }
    var nome = $('#nome').value.trim().replace(/\s+/g, ' ');
    if (!nome) { erros.push('Informe o nome completo do beneficiário'); marca('#nome'); }
    else if (/\./.test(nome) || /(^|\s)[A-DF-ZÀ-Ú](\s|$)/i.test(nome) || nome.split(' ').length < 2) {
      erros.push('O nome parece abreviado — informe o nome completo, sem abreviações'); marca('#nome');
    }
    if (!cpfValido($('#cpf').value)) { erros.push('CPF inválido ou em branco'); marca('#cpf'); }
    if ($('#endereco').value.trim().length < 8) { erros.push('Informe o endereço completo'); marca('#endereco'); }
    if (so($('#telefone').value).length < 10) { erros.push('Informe o telefone com DDD'); marca('#telefone'); }
    if (!radio('motivo')) { erros.push('Escolha o motivo do desligamento'); marca('#motivo'); }
    if (radio('motivo') === 'outros' && !$('#motivoOutros').value.trim()) { erros.push('Especifique o motivo "Outros"'); marca('#motivoOutros'); }
    return erros;
  }

  // ---------- gerar ----------
  $('#gerar').onclick = async function () {
    var erros = validar(), box = $('#erros');
    if (erros.length) {
      box.innerHTML = '<b>Corrija antes de gerar:</b><ul>' + erros.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
      box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    box.hidden = true;
    var btn = $('#gerar'); btn.disabled = true; $('#status').textContent = 'Gerando PDF…';
    try {
      var resp = await fetch('modelos/termo-exclusao.pdf');
      if (!resp.ok) throw new Error('modelo não encontrado');
      var nome = $('#nome').value.trim().replace(/\s+/g, ' ').toUpperCase();
      var bytes = await Termo.gerar({
        PDFLib: PDFLib, modelo: await resp.arrayBuffer(),
        dados: {
          nome: nome, cpf: $('#cpf').value, endereco: $('#endereco').value.trim().replace(/\s+/g, ' ').toUpperCase(),
          telefone: $('#telefone').value, motivo: radio('motivo'), motivoOutros: $('#motivoOutros').value.trim().toUpperCase(),
          data: new Date()
        }
      });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      a.download = 'Termo exclusao Unimed - ' + nome.replace(/[^\w\sÀ-ÿ]/g, '') + '.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { window.open(a.href, '_blank'); }, 300);
      $('#status').textContent = 'PDF gerado e baixado.';
      $('#pos').hidden = false;
    } catch (e) {
      console.error(e);
      $('#status').textContent = 'Erro ao gerar: ' + e.message;
    } finally { btn.disabled = false; }
  };
})();
