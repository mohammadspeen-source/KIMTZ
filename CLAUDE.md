# Projektregeln

## Secrets

- Niemals `.env`, `.env.local`, `.env.*.local` oder Dateien mit `secret`/`credentials`
  im Namen lesen, öffnen oder in Befehlen ausgeben (kein `cat`, `Read`, `echo $VAR`, etc.).
- Diese Dateien enthalten reale Zugangsdaten (Supabase Management-Token, `service_role`-Key,
  DB-Passwort) und sind bewusst in `.gitignore` — sie dürfen nie committed werden.
- Werte aus diesen Dateien werden ausschließlich vom Nutzer selbst eingetragen und von
  Skripten/Prozessen zur Laufzeit gelesen, nie von mir zitiert oder weiterverarbeitet.
- Der öffentliche Supabase `anon`-Key in `script.js` ist bewusst **kein** Geheimnis — er ist
  clientseitig sichtbar und durch Row-Level-Security abgesichert (nur INSERT erlaubt).
