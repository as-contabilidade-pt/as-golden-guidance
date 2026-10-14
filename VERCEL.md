# Ativar as submissões automáticas na Vercel

O código está preparado; só fica ativo após configurar e publicar na Vercel. Não foi publicado nem configurado remotamente por esta alteração.

1. Confirmar o **plano Pro ou Enterprise**: o plano Hobby não permite verificações de hora a hora e rejeita este agendamento na publicação.
2. No projeto Vercel, abrir **Settings → Environment Variables**. Criar `CRON_SECRET` no ambiente **Production**, usando um valor aleatório seguro de pelo menos 32 caracteres gerado por um gestor de palavras-passe. Não o colocar no código ou no chat. A Vercel envia-o automaticamente na autorização dos pedidos agendados.
3. Confirmar que `SITE_URL` contém o endereço público definitivo da Vercel (por exemplo, o domínio real do portal, sem `/login`). Os botões dos emails usam esse endereço.
4. Confirmar que a publicação utiliza as ligações já existentes à base de dados e as variáveis `RESEND_API_KEY` e `RESEND_FROM`. Não copiar as configurações de outro ambiente nem alterar o email Microsoft 365.
5. Fazer **Redeploy** para Production. Em **Cron Jobs**, confirmar o caminho `/api/public/jobs/vercel` e verificar a primeira execução nos registos da Vercel.

## O que fica agendado

- Uma execução por hora, **24 vezes por dia**, para processar os prazos de reabertura terminados. O acesso do cliente termina no prazo; a submissão automática e os emails podem surgir até cerca de uma hora depois, acrescida da duração do processamento.
- Essa mesma execução verifica se é **dia 10, às 09:00 em Europe/Lisbon**, e processa as submissões mensais. A configuração adapta-se à hora de verão/inverno, apesar de a Vercel agendar em UTC. Não garante o segundo exato de entrega dos emails.
- São utilizadas as regras existentes: meses sem documentos não geram submissão automática; a confirmação manual mantém-se disponível e os emails vão para os destinatários reais.
- As execuções e chamadas de email podem aumentar os custos; verificar os limites de duração da função e os registos com o volume real de clientes. Não foi testado um envio real em Production nesta alteração.

## Separação de ambientes

O novo GET usa apenas `CRON_SECRET`. Os callbacks POST geridos pela Lovable mantêm a autenticação existente, sem alteração de credenciais ou agendamentos. A Vercel processa a base de dados configurada no próprio projeto. Se as duas publicações vierem a utilizar a mesma base de dados, escolher um único agendador antes de ativar o segundo para evitar execuções concorrentes.

## Verificação após publicação

- Confirmar que um pedido sem autorização ao caminho agendado é recusado.
- Utilizar uma reabertura de teste autorizada e com documentos, aguardar o fim do prazo e confirmar no portal a submissão e a receção dos dois emails.
- No dia 10, confirmar nos registos a execução das 09:00 de Lisboa e verificar os emails. Não executar manualmente em Production para testar: a operação pode submeter documentação real.