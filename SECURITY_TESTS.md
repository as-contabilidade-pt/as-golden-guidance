# Testes de segurança

Confirmam que um cliente nunca vê nem altera dados de outro, que ninguém se torna admin sozinho e que visitantes anónimos não leem nada privado.

## 1. Teste SQL (mais simples)
1. Escolher dois clientes de teste e copiar os seus IDs (Authentication → Users).
2. Abrir `supabase/rls-impersonation-tests.sql`, substituir os dois UUIDs em `>>> EDITAR <<<`.
3. Colar no SQL Editor e correr. Aparece uma tabela: todas as linhas devem dizer **PASS**.
   Nada é gravado (termina com ROLLBACK).

## 2. Teste externo (simula um atacante real pela internet)
Requer Node 18+ e duas contas de cliente de teste com palavra-passe.

```bash
SUPABASE_URL=https://<projeto>.supabase.co \
SUPABASE_ANON_KEY=<chave pública> \
CLIENT_A_EMAIL=a@teste.pt CLIENT_A_PASSWORD=... \
CLIENT_B_EMAIL=b@teste.pt CLIENT_B_PASSWORD=... \
node scripts/security-tests.mjs
```

Resultado: tabela PASS/FAIL. Código de saída 0 = tudo passou.

## O que é testado
- Anónimo não lê nenhuma tabela privada
- Cliente A não lê documentos, submissões, pedidos, perfil ou ficha do B
- Cliente A não insere/submete/altera em nome do B
- Cliente não se promove a admin nem auto-aprova desbloqueios
- Submissão sem declaração aceite é recusada
- Cliente não acede às conversões de extratos (só admin)
- Storage: A não lista nem carrega na pasta do B; ficheiros não-PDF recusados

Qualquer **FAIL** deve ser partilhado antes de receber documentos reais.
