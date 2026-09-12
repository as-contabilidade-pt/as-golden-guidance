# Fase 4 — Digitalizar documentos com a câmara

Adicionar, ao lado do botão de envio de PDF em cada pasta (categoria + mês), um segundo botão "Digitalizar Documento" com ícone de câmara, que transforma fotografias em PDF.

## Como vai funcionar para o cliente

1. Na pasta aberta, ao lado de "Enviar PDF", aparece "Digitalizar Documento".
2. No telemóvel abre diretamente a câmara traseira; no computador abre o seletor de imagens com a nota "Melhor no telemóvel".
3. Depois da foto, abre-se uma janela com:
   - pré-visualização das páginas capturadas, numeradas;
   - "Repetir" para substituir a última página e "Adicionar página" para juntar mais fotos;
   - "Remover" página individual;
   - "Confirmar e gerar PDF".
4. Ao confirmar, as imagens são comprimidas e reunidas num único PDF (A4, uma página por foto), com nome do tipo `digitalizacao-AAAAMMDD-HHMM.pdf`.
5. Esse PDF segue exatamente o fluxo já existente: mesma numeração automática MM-NN, mesma pasta, mesmas regras de bloqueio e de submissão final.

## Estados e mensagens (português de Portugal)

- Pasta bloqueada ou já submetida: o botão de digitalização não aparece, igual ao de envio de PDF.
- Sem autorização de câmara: "É necessário autorizar o acesso à câmara para digitalizar documentos."
- Ficheiro que não seja imagem: "Selecione uma fotografia para digitalizar."
- Durante a geração: indicador "A preparar PDF…" e botões desativados.

## Detalhes técnicos

- Instalar `jspdf`, importado de forma dinâmica (apenas no browser) para não afetar o SSR.
- Novo componente `src/components/portal/ScanDialog.tsx`:
  - `<input type="file" accept="image/*" capture="environment">` oculto;
  - páginas guardadas em estado como `{ dataUrl, width, height }`, criadas com `<canvas>` redimensionado (lado maior máx. ~1600px) e `toDataURL("image/jpeg", 0.7)`, garantindo tipicamente < 1 MB por página;
  - gera `Blob` PDF e devolve um `File` ao componente pai.
- Em `DocumentExplorer.tsx`:
  - extrair a lógica de envio para aceitar `File[]` (já existe em `handleFiles`), permitindo reutilização com o PDF digitalizado;
  - relaxar a validação de extensão apenas para o ficheiro gerado (já é `application/pdf`, logo passa sem alteração);
  - novo botão de contorno dourado com ícone `Camera` ao lado de "Enviar PDF", com os mesmos estados de `busy`/`readOnly`.
- Nada muda no servidor, no armazenamento nem na base de dados: reutiliza `reserveDocument`, o upload para o bucket e `confirmDocument`.
