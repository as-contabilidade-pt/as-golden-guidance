# AS | Contabilidade, Fiscalidade e Gestão — Site institucional

Site de uma só página, elegante clássico (preto profundo, dourado champagne, creme), com navegação suave entre secções e formulário de contacto que guarda os pedidos.

## Identidade visual

- Cores: preto #0a0a0a, dourado #c9a227, creme #f5f2ea (definidas como tokens do tema, sem cores fixas soltas nos componentes).
- Tipografia: serifado elegante (Playfair Display) para títulos, sans-serif fina (Montserrat Light) para texto e menus, maiúsculas com espaçamento generoso.
- Texturas: padrões geométricos dourados muito ténues (linhas, motivos Art Déco) gerados em CSS/SVG, sem fotografias de stock.
- Separadores: linhas finas douradas e pequenos ornamentos geométricos nos cantos.
- Botões: contorno dourado fino, preenchimento sólido no hover, cantos quase retos, maiúsculas espaçadas.
- Ícones: apenas contorno fino dourado, estilo minimalista.

## Estrutura da página (/)

1. Hero — fundo preto com padrão dourado subtil, "SEJA BEM-VINDO!", texto de apresentação, botão "CONHEÇA-NOS".
2. Sobre Nós — texto de apresentação da Andreia Sofia + valores (Integridade, Profissionalismo, Confidencialidade, Excelência, Responsabilidade) com ícones lineares.
3. Princípios — texto sobre a abordagem estratégica, contabilidade digital e rede de parceiros.
4. Serviços — grelha de 6 cartões com borda dourada fina: Contabilidade Organizada, Regime Simplificado, Salários, Projetos IEFP, IRS, Consultorias.
5. Contactos — horário, telefone, email, morada e formulário (Nome, Último Nome, Email, Mensagem).
6. Rodapé — links legais (Termos e Condições, Política de Privacidade, Livro de Reclamações, RAL), links úteis (Portal das Finanças, OCC, ePortugal, Segurança Social Direta) e copyright 2026.

Header fixo: logótipo (círculo preto com "S" dourado), menu SOBRE NÓS / PRINCÍPIOS / SERVIÇOS / CONTACTOS com scroll suave, e botão em destaque "Área de Cliente" que leva a /login. Transparente sobre o hero, sólido ao fazer scroll.

## Página /login

Página reservada, no mesmo estilo visual: cartão central com campos de email/palavra-passe desativados e a nota de que a área de cliente estará disponível em breve. Sem autenticação nesta fase.

## Formulário de contacto

Ativa-se o Lovable Cloud (base de dados integrada) para guardar as mensagens numa tabela `contact_messages` (nome, apelido, email, mensagem, data). Qualquer visitante pode enviar; a leitura fica restrita, não pública. Confirmação visível ao utilizador após envio.

## Notas técnicas

- Fontes carregadas por `<link>` no `__root.tsx`; tokens de cor, tipografia e ornamentos em `src/styles.css` (Tailwind v4 `@theme`).
- Secções em componentes próprios sob `src/components/`, compostos em `src/routes/index.tsx` (substitui o placeholder).
- Nova rota `src/routes/login.tsx`.
- Metadados de SEO próprios em `/` e `/login` (título, descrição, og/twitter), em português.
- Formulário validado com Zod e gravado através de uma server function; tabela criada por migração com RLS e grants (insert para anónimos, leitura apenas para service role).
- Totalmente responsivo; menu em painel lateral no telemóvel.
