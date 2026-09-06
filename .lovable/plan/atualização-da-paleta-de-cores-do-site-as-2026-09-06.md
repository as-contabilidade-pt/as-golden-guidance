Atualização da paleta de cores do site AS

Objetivo
Trocar a aparência atual (quase todo preto/cinzento) por uma direção mais clara e sofisticada, ainda elegante: preto, branco/crème e dourado, com mais respiro e contraste.

Direção escolhida
- Fundo principal em branco quente/crème (#FAF9F6), dando mais luminosidade ao site.
- Texto e elementos de peso em preto profundo (#111111).
- Dourado/champagne (#C5A059) mantido como cor de destaque em badges, ícones, botões primários e detalhes.
- Secções de contraste (hero e contactos) podem continuar mais escuras para garantir legibilidade sobre as fotografias existentes, mas com maior equilíbrio entre claro e escuro ao longo da página.

Passos
1. Atualizar tokens globais em `src/styles.css`: adicionar cores de fundo claro, superfícies escuras e texto claro/escuro; manter o dourado.
2. Revisar `src/routes/index.tsx`, `Header.tsx`, `Footer.tsx`, `Hero.tsx`, `About.tsx`, `Principles.tsx`, `Services.tsx`, `Contact.tsx`, `login.tsx`, `termos.tsx` e `privacidade.tsx` para aplicar a nova paleta (fundo claro, cartões brancos/crème com sombra suave, texto preto, detalhes dourados).
3. Ajustar botões e links para funcionarem em fundos claros: botão primário dourado com texto escuro, botão secundário com contorno/preto.
4. Manter o hero legível: usar overlay escuro sobre a fotografia do escritório e texto claro, enquanto o resto do site passa a fundo claro.
5. Verificar responsividade e contraste em mobile.
6. Validar build e capturar screenshots da página para confirmar o resultado.

Restrições
- Manter logótipo, tipografia, fotografias e estrutura de secções.
- Não alterar funcionalidade (formulário, WhatsApp, links, login).
