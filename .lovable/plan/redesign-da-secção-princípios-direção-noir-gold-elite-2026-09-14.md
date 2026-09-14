# Redesign da secção Princípios — direção "Noir Gold Elite"

Aplicar a direção escolhida à secção existente `src/components/site/Principles.tsx`, mantendo a imagem e os três princípios atuais, mas com novo tratamento visual: fundo escuro luxuoso, tipografia refinada, separadores dourados interativos e destaques em ouro champagne.

## Alterações visuais

- Fundo da secção passa a escuro (`bg-ink` / `#0a0a0a`) para criar contraste com as secções claras vizinhas.
- Manter a fotografia do escritório existente, agora enquadrada como um objeto central/arredondado, com uma moldura sutil dourada.
- Badge decorativo "Desde o primeiro dia, ao seu lado." reposicionado e com tratamento dourado/preto.
- Título "Princípios" com overline "A nossa abordagem" em dourado, texto claro sobre fundo escuro.
- Os três princípios numerados (01, 02, 03) apresentam-se como uma lista elegante:
  - números em itálico dourado;
  - títulos em serif claro;
  - linha dourada fina abaixo de cada título que se expande suavemente no hover;
  - texto descritivo em tom creme suave.
- Adicionar pequeno indicador decorativo dourado no final da lista (três pontos com opacidade degradê).
- Garantir responsividade: mobile empilha imagem acima do conteúdo; desktop mantém layout de duas colunas com a imagem à esquerda.

## Ficheiros a alterar

- `src/components/site/Principles.tsx` — reescrever o componente com a nova composição e tokens semânticos.
- `src/styles.css` — se necessário, adicionar/utilizar tokens para fundo escuro, bordas douradas subtis e utilitários de hover da linha dourada.

## Validação

- Correr `bunx tsgo --noEmit`.
- Verificar build sem erros.
- Capturar screenshot da secção em desktop e mobile para confirmar o contraste, a legibilidade e a nova composição.
