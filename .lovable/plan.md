# Simplificar o Hero — estilo minimalista

Deixar a parte inicial da página mais limpa e com menos elementos competindo pela atenção, mantendo a identidade preto/dourado e o nome da empresa visível.

## Alterações propostas

1. **Reduzir o tamanho do título principal**
   - Diminuir "Números com rigor e visão" para uma escala mais contida (ex: `text-3xl`/`text-4xl` em mobile, `text-5xl` em desktop, em vez do tamanho atual).
   - Mantém-se a divisão creme/dourado.

2. **Simplificar o bloco do nome da empresa**
   - Reduzir ligeiramente o "AS" para não dominar tanto o ecrã.
   - Afastar o nome por uma linha fina dourada mais subtil.
   - Manter o alinhamento horizontal no desktop e vertical no mobile.

3. **Reduzir informação secundária**
   - Remover a grelha de 3 cartões no fundo do hero ("Presencial/e remoto", "Empresas/e independentes", "Contabilidade/digital").
   - Substitui-los por uma única linha de texto curto, se necessário, ou omiti-los do hero.

4. **Aumentar o respiro visual**
   - Aumentar o espaçamento entre o nome, o título, a descrição e os botões.
   - Reduzir a altura mínima da secção para evitar que o conteúdo fique esmagado.

5. **Manter os botões de ação**
   - "Ver serviços" e "Falar connosco" permanecem, sem alterações estruturais.

## Ficheiros a alterar

- `src/components/site/Hero.tsx` — ajustar tipografia, espaçamento e remover/ suavizar elementos secundários.

## Critério de conclusão

- Hero apresenta nome da empresa, título reduzido, descrição curta e dois botões.
- Sem a grelha de 3 cartões no fundo.
- Visual equilibrado e minimalista, validado por screenshot desktop e mobile.
