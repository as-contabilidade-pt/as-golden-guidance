# Ativar as submissões automáticas na Vercel

Compatível com o plano **Hobby** (gratuito): o agendamento corre **uma vez por dia**, por volta das 08:00 UTC (09:00 de Lisboa no verão, 08:00 no inverno; a Vercel Hobby pode executar em qualquer minuto dessa hora).

1. No projeto Vercel, abrir **Settings → Environment Variables**. Criar `CRON_SECRET` em **Production** com um valor aleatório de pelo menos 32 caracteres. Não o colocar no código ou no chat.
2. Confirmar que `SITE_URL` contém o endereço público da Vercel (sem `/login`).
3. Confirmar `RESEND_API_KEY`, `RESEND_FROM` e as ligações à base de dados.
4. Fazer **Redeploy** e, em **Cron Jobs**, confirmar o caminho `/api/public/jobs/vercel`.

## O que fica agendado

- Execução diária que submete automaticamente as reaberturas cujo prazo de 72 horas úteis terminou e envia os emails ao cliente e à contabilista. O acesso do cliente termina no prazo; os emails chegam na execução seguinte (manhã do dia seguinte).
- No **dia 10** (Europe/Lisbon), a mesma execução processa as submissões mensais pendentes.
- Meses sem documentos não geram submissão automática.

## Separação de ambientes

O GET usa apenas `CRON_SECRET`. Os callbacks POST geridos pela Lovable mantêm a autenticação existente. Se as duas publicações usarem a mesma base de dados, escolher um único agendador.
