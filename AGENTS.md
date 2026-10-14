<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep administration activity in shared portal components with separate submissions and unlock-history routes; the main panel shows only pending unlock requests to prioritize decisions.
- Constrain shared dialogs to the dynamic viewport and use shrinkable grid tracks for mixed text/action rows so phone and tablet layouts remain usable without page-level horizontal scrolling.
- Keep client-list rows focused on identification and document access; place editing, access management and confirmed deletion in the client detail page with compact tabbed sections.
- Keep Vercel cron work in a separately authenticated GET callback using CRON_SECRET and a consolidated hourly schedule; preserve managed POST callbacks so existing schedules retain their credentials and behavior.
- Keep statement batches isolated per source document; persist reviewed rows before export and package one workbook per document under separate client/month ZIP paths.
