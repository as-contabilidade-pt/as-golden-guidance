# Testes de segurança

Confirmam que um cliente nunca vê nem altera dados de outro, que ninguém se torna admin sozinho, que as regras de mês são respeitadas e que visitantes anónimos não leem nada privado. Nunca usar dados reais: tudo o que os testes criam começa por `__teste__`.

## 0. Preparar contas de teste (uma vez)
No painel de admin → **Clientes → Novo cliente**:
- **Cliente A** e **Cliente B**: nome `__teste__ A` / `__teste__ B`, NIF fictício, email próprio de teste, pasta **ativa**. Definir password pelo email de convite.
- **Cliente C** (opcional): igual mas com pasta **inativa** (para o teste 22).
- Para o teste 19 completo, o Cliente B deve ter pelo menos um documento num mês antigo (há 3 meses).

## 1. Script automático (22 testes)
Requer Node 18+.
1. `cp .env.test.example .env.test` e preencher (o `.env.test` está no `.gitignore`). Usar só a chave pública — **nunca a service_role**.
2. (Opcional, teste 9) No browser, entrar como admin, abrir *Ferramentas de programador → Rede*, criar um cliente e converter um extrato, copiar os URLs `/_serverFn/...` desses pedidos para `ADMIN_FN_URLS`.
3. `node scripts/security-tests.mjs`

Resultado: tabela PASS / FAIL / SKIP. Código de saída 0 = tudo passou.

Depois de correr:
- A submissão de teste do Cliente A no mês corrente fica gravada (o cliente não a pode apagar — é essa a regra). Desbloquear o mês no painel de admin.
- Apagar as mensagens de contacto cujo nome começa por `__teste__`.

## 2. Teste SQL (mesmas verificações de dados)
`supabase/rls-impersonation-tests.sql` → substituir os UUIDs em `>>> EDITAR <<<`, colar no SQL Editor e correr. Termina em `ROLLBACK`: nada fica gravado.
**Limitação:** o SQL só vê os metadados do Storage. Downloads, URLs assinadas, tipo de ficheiro e tamanho só são testados pelo script Node (testes 3, 4, 12, 14).

## 3. Checklist manual no browser
Usar dois perfis do browser (ou uma janela anónima): um admin e um cliente de teste.

- [ ] **Desbloqueio completo:** cliente pede desbloqueio de um mês fechado → admin aprova → cliente envia PDF → documento aparece como «fora de prazo» → admin volta a bloquear → cliente já não consegue enviar.
- [ ] **URL direto a /admin** com sessão de cliente → é redirecionado, não vê dados.
- [ ] **Documentos de outro cliente:** como admin copiar o URL `/admin/cliente/<id>` de outro cliente; colar na sessão do cliente → acesso recusado.
- [ ] **Convite reutilizado:** usar o link de convite já usado → erro / pede novo link.
- [ ] **Convite expirado:** link com mais de 24 h → erro claro.
- [ ] **Recuperar palavra-passe:** pedir no login, receber email, definir nova, entrar.
- [ ] **Terminar sessão + «Voltar»:** depois de sair, o botão Voltar não mostra dados privados (recarrega para o login).
- [ ] **Telemóvel:** login, envio de PDF (incluindo câmara), submissão e pedido de desbloqueio funcionam sem scroll horizontal.

Qualquer **FAIL** deve ser corrigido antes de receber documentos reais.
