# Sofia & Co. Accounting

Cria uma aplicação web (página única / one-page) para "AS | Contabilidade, Fiscalidade e Gestão", 
gerida pela contabilista certificada Andreia Sofia, em Viseu, Portugal.

## DIREÇÃO VISUAL: ELEGANTE CLÁSSICO

- Paleta: preto profundo (#0a0a0a) como base, dourado/champagne (#c9a227 ou #b8942f) como cor 
  de destaque, branco/creme (#f5f2ea) para texto sobre fundo escuro e para fundos alternados 
  entre secções.
- Tipografia: um serifado elegante para títulos (ex: estilo "Playfair Display" ou "Cormorant") 
  combinado com uma sans-serif fina e espaçada para texto corrido e menus (ex: estilo " 
  Montserrat" light, com letter-spacing generoso em maiúsculas para os títulos de menu).
- Texturas subtis: usar padrões geométricos finos em dourado com baixa opacidade (linhas, 
  motivos Art Déco discretos, ou um padrão tipo "linho"/mármore muito ténue) como fundo de 
  secções, em vez de fotografias genéricas de stock. Evitar fotos genéricas de "sala de 
  reuniões" ou "aperto de mão" tipo banco de imagens — preferir formas geométricas, linhas 
  douradas finas, molduras decorativas e bastante espaço negativo.
- Divisórias entre secções: linhas finas douradas (não blocos de cor sólidos e pesados), 
  cantos com pequenos ornamentos geométricos inspirados no símbolo do "S" do logótipo.
- Botões: contornos dourados finos com preenchimento a dourado sólido no hover, cantos 
  ligeiramente arredondados ou retos (não muito "boutique"/redondos), letras maiúsculas com 
  espaçamento.
- Hero (secção inicial): fundo preto com o padrão geométrico dourado subtil, título grande 
  em serifado, sem foto de stock — o impacto vem da tipografia e da composição, não da imagem.
- Ícones dos serviços: linha fina dourada (outline), estilo minimalista/elegante, não ícones 
  preenchidos ou coloridos.
- Sensação geral: sóbrio, confiável, discreto — like um escritório de advocacia ou banco 
  privado de prestígio, não uma startup moderna nem um site "fintech" colorido.

## HEADER E NAVEGAÇÃO
- Header fixo (sticky), fundo preto ou transparente sobre o hero, tornando-se sólido ao 
  fazer scroll.
- Logótipo à esquerda (círculo preto com "S" dourado).
- Menu à direita: SOBRE NÓS, PRINCÍPIOS, SERVIÇOS, CONTACTOS — clicar faz scroll suave até 
  à respetiva secção da mesma página (não navega para páginas diferentes).
- Botão adicional no header, com destaque: "Área de Cliente" (login).

## ESTRUTURA DA PÁGINA (secções, por esta ordem)

1. **Hero / Início**
   - Título: "SEJA BEM-VINDO!"
   - Texto: "Descubra o nosso mundo de conhecimento em contabilidade, fiscalidade e gestão, onde 
     cuidamos dos números para que se possa focar no crescimento do seu negócio, através dos 
     nossos serviços de apoio à gestão."
   - Botão CTA "CONHEÇA-NOS" que faz scroll até à secção Sobre Nós.

2. **Sobre Nós**
   - Texto: "Somos representados pela Andreia Sofia, uma Contabilista Certificada com experiência 
     e dedicação. Oferecemos serviços de contabilidade personalizados para empresas e trabalhadores 
     independentes em Portugal. Adaptamo-nos às necessidades do mundo de negócios atual, 
     proporcionando serviços de contabilidade tanto remotamente como presencialmente. Junte-se a 
     nós para um acompanhamento contabilístico e fiscal completo, com apoio à gestão, que vai além 
     das necessidades legais."
   - Valores em destaque, apresentados como uma lista elegante com pequenos ícones lineares 
     dourados: Integridade, Profissionalismo, Confidencialidade, Excelência, Responsabilidade.

3. **Princípios**
   - Texto: "A nossa abordagem de trabalho centra-se em utilizar a contabilidade como uma 
     ferramenta estratégica de apoio à gestão, indo além do mero cumprimento de obrigações. 
     Adotamos a contabilidade digital para uma metodologia mais ecológica e eficiente, minimizando 
     o consumo de recursos com o uso de ferramentas digitais. Além disso, contamos com uma rede de 
     parceiros em áreas complementares para oferecermos um suporte abrangente."

4. **Serviços** (grid de cards elegantes, fundo levemente diferenciado, borda fina dourada, 
   ícone linear + título serifado + descrição curta)
   - Contabilidade Organizada: apoio à constituição de sociedades, cumprimento de obrigações 
     contabilísticas e fiscais, reporte regular de informação financeira.
   - Regime Simplificado: entrega de declarações, emissão de faturas/recibos verdes, guias de 
     pagamento, análise da evolução do negócio.
   - Salários: gestão de salários, declarações mensais de remunerações (Finanças e Segurança Social).
   - Projetos IEFP: elaboração de planos de negócio e projetos económico-financeiros para 
     candidaturas a apoios públicos.
   - IRS: simulação fiscal, preparação e submissão eletrónica da declaração de IRS.
   - Consultorias: pré-consultoria, consultoria presencial/remota, resumo escrito por e-mail.

5. **Contactos**
   - Horário: 8h30-12h30 | 14h00-18h00
   - Telefone: 965 378 291
   - Email: geral@as-contabilidade.pt
   - Morada: Av. José Gonçalves Pais, nº21, 3515-146 Viseu
   - Formulário de contacto (Nome, Último Nome, Email, Mensagem) que grava o pedido na base de dados 
     (tabela "contact_messages").

6. **Footer**
   - Fundo preto, texto dourado/creme fino.
   - Links: Termos e Condições, Política de Privacidade, Livro de Reclamações 
     (livroreclamacoes.pt), Resolução Alternativa de Litígios.
   - Links úteis: Portal das Finanças, Ordem dos Contabilistas Certificados, ePortugal, 
     Segurança Social Direta.
   - Copyright "© 2026 AS - Contabilidade, Fiscalidade e Gestão".

## REQUISITOS TÉCNICOS
- Site totalmente responsivo (mobile, tablet, desktop).
- Página única (one-page) para o conteúdo institucional.
- Reserva já uma rota /login (sem funcionalidade completa ainda, só a página/botão), porque 
  vamos adicionar autenticação e área de cliente numa fase seguinte.
- Português de Portugal em todos os textos.

NOTA: Este é o primeiro passo (site institucional). O sistema de login, área de cliente e 
submissão de documentos serão adicionados em fases seguintes — não implementes essas 
funcionalidades ainda, só deixa a rota /login preparada.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://as-golden-guidance.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c28c1f98-ed40-4a06-adf9-6946926d86b9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
